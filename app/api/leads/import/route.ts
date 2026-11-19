// Ingestion machine-to-machine des leads produits par LeadGenEngine.
// Authentification par clé d'API (header `x-api-key`) : cette route n'a pas
// de session utilisateur, contrairement à /api/import qui sert la modale.
// `/api` est hors du matcher du middleware : l'auth est donc faite ici.
import { createHash, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore } from "@/lib/scoring";

export const runtime = "nodejs";

// ---- Rate limiting en mémoire (checklist secure.md) ----------------------
// Même limite que /api/import : en mémoire du process, donc remise à zéro à
// chaque démarrage à froid. Suffisant pour un moteur de scraping unique.
const RATE_MAX = Number(process.env.LEADGEN_RATE_LIMIT_MAX ?? 60);
const RATE_WINDOW = Number(process.env.LEADGEN_RATE_LIMIT_WINDOW_SECONDS ?? 600) * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return { ok: true, remaining: RATE_MAX - 1 };
  }
  entry.count++;
  return { ok: entry.count <= RATE_MAX, remaining: Math.max(0, RATE_MAX - entry.count) };
}

/** Comparaison à durée constante : empêche de deviner la clé octet par octet.
 *  Les deux valeurs sont hachées d'abord pour égaliser les longueurs, car
 *  `timingSafeEqual` lève une exception sur des tampons de tailles différentes. */
function sameKey(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const MAX_LEADS = 500;

// ---- Schéma d'entrée -----------------------------------------------------
// Tout est optionnel sauf `place_id` (clé de déduplication) et `name` :
// LeadGenEngine peut n'avoir trouvé qu'une partie des signaux.
const nullableText = z.string().trim().min(1).max(5000).nullish();
const nullableInt = z.coerce.number().int().nullish();

const companySchema = z.object({
  // Mappé vers `companies.google_place_id` (clé unique historique du CRM).
  place_id: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(500),

  category: nullableText,
  address: nullableText,
  city: nullableText,
  postal_code: z.string().trim().max(20).nullish(),
  department: z.string().trim().max(100).nullish(),
  phone: nullableText,
  website: nullableText,
  // Accepte les deux vocabulaires : celui du CRM et celui des scrapers.
  gbp_url: nullableText,
  google_maps_url: nullableText,

  lat: z.coerce.number().min(-90).max(90).nullish(),
  lng: z.coerce.number().min(-180).max(180).nullish(),
  is_claimed: z.coerce.boolean().nullish(),
  opening_hours: z.record(z.string(), z.string()).nullish(),
  siren: z.string().trim().max(20).nullish(),
  siret: z.string().trim().max(20).nullish(),
  multi_location_count: z.coerce.number().int().min(0).nullish(),

  rating: z.coerce.number().min(0).max(5).nullish(),
  reviews_count: nullableInt,
  reviews_last_90_days: nullableInt,
  last_review_date: z.string().trim().max(40).nullish(),
  negative_reviews_count_6m: nullableInt,
  owner_response_rate: z.coerce.number().int().min(0).max(100).nullish(),
  last_negative_review_text: nullableText,
  last_negative_review_date: z.string().trim().max(40).nullish(),
  reviews_needed_for_next_tier: nullableInt,
  local_competitor_benchmark: z
    .object({
      avg_rating: z.coerce.number().nullish(),
      avg_reviews: z.coerce.number().nullish(),
      top_3: z
        .array(
          z.object({
            name: z.string().nullish(),
            rating: z.coerce.number().nullish(),
            reviews: z.coerce.number().nullish(),
          })
        )
        .nullish(),
    })
    .nullish(),

  // Scoring : pris en compte seulement si score ET tier sont fournis.
  lead_score: z.coerce.number().int().min(0).max(100).nullish(),
  lead_tier: z.enum(["A", "B", "C", "D"]).nullish(),
  score_breakdown_text: nullableText,

  recommended_angle: nullableText,
  call_script_hook: nullableText,
  ai_icebreaker: nullableText,

  source: z.string().trim().max(200).nullish(),
  scraped_at: z.string().trim().max(60).nullish(),
});

const contactSchema = z.object({
  first_name: z.string().trim().max(200).nullish(),
  last_name: z.string().trim().max(200).nullish(),
  title: z.string().trim().max(200).nullish(),
  email: z.string().trim().email().max(320).nullish(),
  phone: z.string().trim().max(60).nullish(),
  direct_phone: z.string().trim().max(60).nullish(),
  linkedin_url: z.string().trim().max(500).nullish(),
  email_verification_status: z.enum(["valid", "catch_all", "invalid", "unknown"]).nullish(),
  is_decision_maker: z.coerce.boolean().nullish(),
  last_negative_review: nullableText,
  ai_icebreaker: nullableText,
});

const leadSchema = z.object({
  company: companySchema,
  contact: contactSchema.nullish(),
});

// Accepte un tableau racine ou un objet { leads: [...] }.
const bodySchema = z.union([
  z.array(leadSchema).min(1).max(MAX_LEADS),
  z.object({ leads: z.array(leadSchema).min(1).max(MAX_LEADS) }),
]);

/** Colonnes de `companies` écrites par cette route. PostgREST refuse un
 *  upsert dont les objets n'ont pas exactement les mêmes clés, donc chaque
 *  ligne est normalisée sur cette liste. `lifecycle_status`, `notes`,
 *  `owner_id` n'y figurent pas : le travail commercial n'est jamais écrasé. */
const COMPANY_COLUMNS = [
  "google_place_id",
  "name",
  "category",
  "address",
  "city",
  "postal_code",
  "department",
  "phone",
  "website",
  "gbp_url",
  "lat",
  "lng",
  "is_claimed",
  "opening_hours",
  "siren",
  "siret",
  "multi_location_count",
  "rating",
  "reviews_count",
  "reviews_last_90_days",
  "last_review_date",
  "negative_reviews_count_6m",
  "owner_response_rate",
  "last_negative_review_text",
  "last_negative_review_date",
  "reviews_needed_for_next_tier",
  "local_competitor_benchmark",
  "lead_score",
  "lead_tier",
  "score_breakdown",
  "score_breakdown_text",
  "recommended_angle",
  "call_script_hook",
  "ai_icebreaker",
  "source",
  "scraped_at",
  "batch_id",
] as const;

/** `null` et `undefined` signifient « LeadGenEngine n'a rien trouvé » :
 *  on garde alors la valeur déjà en base plutôt que de l'effacer. */
function keep<T>(incoming: T | null | undefined, existing: T | null | undefined): T | null {
  return incoming === null || incoming === undefined ? (existing ?? null) : incoming;
}

export async function POST(request: NextRequest) {
  // 1. Authentification par clé d'API — fail-closed si la clé n'est pas
  //    configurée côté serveur : on refuse plutôt que de laisser passer.
  const expected = process.env.LEADGEN_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Ingestion indisponible : service non configuré." },
      { status: 503 }
    );
  }
  const provided = request.headers.get("x-api-key");
  if (!provided || !sameKey(provided, expected)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // 2. Rate limiting (clé = empreinte de la clé d'API, jamais la clé en clair)
  const rl = rateLimit(createHash("sha256").update(provided).digest("hex"));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez plus tard." },
      {
        status: 429,
        headers: { "X-RateLimit-Limit": String(RATE_MAX), "X-RateLimit-Remaining": "0" },
      }
    );
  }

  // 3. Validation du corps
  let leads: z.infer<typeof leadSchema>[];
  try {
    const parsed = bodySchema.parse(await request.json());
    leads = Array.isArray(parsed) ? parsed : parsed.leads;
  } catch {
    return NextResponse.json(
      {
        error: `Requête invalide. Attendu : un tableau de { company, contact? } (max ${MAX_LEADS} leads), avec company.place_id et company.name.`,
      },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  const admin = createAdminClient();

  // 4. Déduplication intra-payload sur place_id
  const byPlaceId = new Map<string, z.infer<typeof leadSchema>>();
  leads.forEach((lead, i) => {
    const pid = lead.company.place_id;
    if (byPlaceId.has(pid)) {
      errors.push(`Lead ${i + 1} : doublon de place_id dans la requête (${pid}).`);
      return;
    }
    byPlaceId.set(pid, lead);
  });

  if (byPlaceId.size === 0) {
    return NextResponse.json({ error: "Aucun lead exploitable.", errors }, { status: 400 });
  }

  const placeIds = [...byPlaceId.keys()];

  // 5. Lecture des fiches existantes : sert à la fois au comptage
  //    inserted/updated et à la fusion non destructive.
  const { data: existingRows, error: readErr } = await admin
    .from("companies")
    .select("*")
    .in("google_place_id", placeIds);

  if (readErr) {
    return NextResponse.json({ error: "Erreur de lecture en base." }, { status: 500 });
  }

  const existingByPlaceId = new Map<string, any>(
    (existingRows ?? []).map((r: any) => [r.google_place_id, r])
  );
  const updated = placeIds.filter((p) => existingByPlaceId.has(p)).length;
  const inserted = placeIds.length - updated;

  // 6. Campagne de traçabilité (une par appel). `imported_by` reste null :
  //    l'appelant est un moteur, pas un utilisateur du CRM.
  const batchName = `LeadGenEngine — ${new Date().toLocaleString("fr-FR")}`;
  const { data: batch, error: batchErr } = await admin
    .from("scrape_batches")
    .insert({
      name: batchName,
      source: "google_maps",
      rows_count: placeIds.length,
      imported_by: null,
    })
    .select("id")
    .single();

  if (batchErr) {
    return NextResponse.json({ error: "Erreur de création de la campagne." }, { status: 500 });
  }

  // 7. Construction des lignes à écrire
  const rows = [...byPlaceId.values()].map((lead) => {
    const c = lead.company;
    const prev = existingByPlaceId.get(c.place_id) ?? {};

    const website = keep(c.website, prev.website);
    const phone = keep(c.phone, prev.phone);
    const category = keep(c.category, prev.category);
    const rating = keep(c.rating, prev.rating);
    const reviewsCount =
      c.reviews_count === null || c.reviews_count === undefined
        ? (prev.reviews_count ?? null)
        : Math.round(c.reviews_count);

    // Scoring : LeadGenEngine prioritaire s'il fournit score ET tier.
    // Sinon on recalcule avec le barème maison (source de vérité unique
    // tools/scoring_config.json) et on remplit aussi le détail jsonb.
    const engineScored =
      c.lead_score !== null &&
      c.lead_score !== undefined &&
      c.lead_tier !== null &&
      c.lead_tier !== undefined;

    let leadScore: number;
    let leadTier: string;
    let breakdown: unknown;
    if (engineScored) {
      leadScore = c.lead_score as number;
      leadTier = c.lead_tier as string;
      // On ne fabrique pas de barres incohérentes avec un score externe.
      breakdown = prev.score_breakdown ?? null;
    } else {
      const s = computeScore({ rating, reviews_count: reviewsCount, website, phone, category });
      leadScore = s.lead_score;
      leadTier = s.lead_tier;
      breakdown = s.score_breakdown;
    }

    const row: Record<string, unknown> = {
      google_place_id: c.place_id,
      name: c.name,
      category,
      address: keep(c.address, prev.address),
      city: keep(c.city, prev.city),
      postal_code: keep(c.postal_code, prev.postal_code),
      department: keep(c.department, prev.department),
      phone,
      website,
      gbp_url: keep(c.gbp_url ?? c.google_maps_url, prev.gbp_url),
      lat: keep(c.lat, prev.lat),
      lng: keep(c.lng, prev.lng),
      is_claimed: keep(c.is_claimed, prev.is_claimed),
      opening_hours: keep(c.opening_hours, prev.opening_hours),
      siren: keep(c.siren, prev.siren),
      siret: keep(c.siret, prev.siret),
      multi_location_count: keep(c.multi_location_count, prev.multi_location_count),
      rating,
      reviews_count: reviewsCount,
      reviews_last_90_days: keep(c.reviews_last_90_days, prev.reviews_last_90_days),
      last_review_date: keep(c.last_review_date, prev.last_review_date),
      negative_reviews_count_6m: keep(c.negative_reviews_count_6m, prev.negative_reviews_count_6m),
      owner_response_rate: keep(c.owner_response_rate, prev.owner_response_rate),
      last_negative_review_text: keep(c.last_negative_review_text, prev.last_negative_review_text),
      last_negative_review_date: keep(c.last_negative_review_date, prev.last_negative_review_date),
      reviews_needed_for_next_tier: keep(
        c.reviews_needed_for_next_tier,
        prev.reviews_needed_for_next_tier
      ),
      local_competitor_benchmark: keep(
        c.local_competitor_benchmark,
        prev.local_competitor_benchmark
      ),
      lead_score: leadScore,
      lead_tier: leadTier,
      score_breakdown: breakdown,
      score_breakdown_text: keep(c.score_breakdown_text, prev.score_breakdown_text),
      recommended_angle: keep(c.recommended_angle, prev.recommended_angle),
      call_script_hook: keep(c.call_script_hook, prev.call_script_hook),
      ai_icebreaker: keep(c.ai_icebreaker, prev.ai_icebreaker),
      source: keep(c.source, prev.source) ?? "LeadGenEngine_Apify_GMaps",
      scraped_at: c.scraped_at ?? new Date().toISOString(),
      // L'attribution d'origine est préservée : seules les nouvelles fiches
      // sont rattachées à la campagne de cet appel.
      batch_id: prev.batch_id ?? batch.id,
    };

    // Jeu de clés strictement identique sur toutes les lignes.
    const normalized: Record<string, unknown> = {};
    for (const k of COMPANY_COLUMNS) normalized[k] = row[k] ?? null;
    return normalized;
  });

  // 8. Upsert des entreprises
  const { data: upserted, error: upsertErr } = await admin
    .from("companies")
    .upsert(rows, { onConflict: "google_place_id", ignoreDuplicates: false })
    .select("id, google_place_id");

  if (upsertErr) {
    return NextResponse.json(
      { error: "Erreur d'écriture des entreprises.", errors },
      { status: 500 }
    );
  }

  const companyIdByPlaceId = new Map<string, string>(
    (upserted ?? []).map((r: any) => [r.google_place_id, r.id])
  );

  // 9. Contacts rattachés
  //
  // /!\ Pas d'upsert PostgREST ici. L'index unique de 0004 est PARTIEL
  //     (`where email is not null`), et Postgres refuse d'inférer un index
  //     partiel comme cible de `ON CONFLICT (company_id, email)` tant que le
  //     prédicat de l'index n'est pas répété dans la requête — ce que
  //     PostgREST ne sait pas émettre. Un upsert échouait donc toujours en
  //     42P10 « there is no unique or exclusion constraint matching the
  //     ON CONFLICT specification ». On fait un select puis un update ou un
  //     insert explicite ; l'index partiel reste en base comme garde-fou
  //     d'intégrité contre les écritures concurrentes.
  let contactsInserted = 0;
  let contactsUpdated = 0;

  const withContact = [...byPlaceId.values()].filter(
    (l) => l.contact && (l.contact.email || l.contact.first_name || l.contact.last_name)
  );

  /** Clé de recherche par e-mail, insensible à la casse. */
  const emailKeyOf = (companyId: string, email: string) =>
    `${companyId}|${email.toLowerCase()}`;

  /** Clé de recherche par nom. `null` si le nom est vide : sans nom ni
   *  e-mail, deux contacts distincts auraient la même clé. */
  const nameKeyOf = (companyId: string, first?: string | null, last?: string | null) => {
    const n = `${first ?? ""} ${last ?? ""}`.trim().toLowerCase();
    return n ? `${companyId}|${n}` : null;
  };

  if (withContact.length > 0) {
    const companyIds = [
      ...new Set(
        withContact
          .map((l) => companyIdByPlaceId.get(l.company.place_id))
          .filter(Boolean) as string[]
      ),
    ];

    // Contacts déjà présents sur ces fiches : évite de dupliquer une personne
    // à chaque relance de scraping.
    const { data: existingContacts, error: ecErr } = await admin
      .from("contacts")
      .select("id, company_id, email, first_name, last_name")
      .in("company_id", companyIds);

    if (ecErr) {
      errors.push(`Contacts non traités : lecture impossible (${ecErr.message}).`);
    } else {
      const byEmail = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const ec of (existingContacts ?? []) as any[]) {
        if (ec.email) byEmail.set(emailKeyOf(ec.company_id, String(ec.email)), ec.id);
        const nk = nameKeyOf(ec.company_id, ec.first_name, ec.last_name);
        if (nk && !byName.has(nk)) byName.set(nk, ec.id);
      }

      for (const lead of withContact) {
        const companyId = companyIdByPlaceId.get(lead.company.place_id);
        const ct = lead.contact!;
        if (!companyId) {
          errors.push(
            `Contact ignoré : entreprise ${lead.company.place_id} introuvable après écriture.`
          );
          continue;
        }

        const email = ct.email ? ct.email.toLowerCase() : null;
        const payload: Record<string, unknown> = {
          company_id: companyId,
          first_name: ct.first_name ?? null,
          last_name: ct.last_name ?? null,
          title: ct.title ?? null,
          email,
          phone: ct.phone ?? null,
          direct_phone: ct.direct_phone ?? null,
          linkedin_url: ct.linkedin_url ?? null,
          email_verification_status: ct.email_verification_status ?? null,
          is_decision_maker: ct.is_decision_maker ?? false,
          last_negative_review: ct.last_negative_review ?? null,
          ai_icebreaker: ct.ai_icebreaker ?? null,
          // Un contact livré avec un e-mail est un contact enrichi.
          enrichment_status: email ? "enrichi" : "a_enrichir",
          enriched_at: new Date().toISOString(),
        };

        // Identification : l'e-mail d'abord, le nom en repli.
        const ek = email ? emailKeyOf(companyId, email) : null;
        const nk = nameKeyOf(companyId, ct.first_name, ct.last_name);
        const existingId =
          (ek ? byEmail.get(ek) : undefined) ?? (nk ? byName.get(nk) : undefined) ?? null;

        if (existingId) {
          const { error: uErr } = await admin
            .from("contacts")
            .update(payload)
            .eq("id", existingId);
          if (uErr) {
            errors.push(`Contact de ${lead.company.name} non mis à jour : ${uErr.message}`);
          } else {
            contactsUpdated++;
            // L'e-mail vient peut-être d'être renseigné : on indexe la clé
            // pour qu'un doublon plus loin dans le payload soit reconnu.
            if (ek) byEmail.set(ek, existingId);
          }
          continue;
        }

        const { data: created, error: iErr } = await admin
          .from("contacts")
          .insert(payload)
          .select("id")
          .single();

        if (iErr || !created) {
          errors.push(
            `Contact de ${lead.company.name} non enregistré : ${iErr?.message ?? "insertion vide"}`
          );
          continue;
        }

        contactsInserted++;
        // Même personne répétée plus loin dans le payload : elle sera mise à
        // jour, pas insérée une seconde fois.
        if (ek) byEmail.set(ek, created.id);
        if (nk && !byName.has(nk)) byName.set(nk, created.id);
      }
    }
  }

  return NextResponse.json({
    inserted,
    updated,
    errors,
    skipped: errors.length,
    contacts_inserted: contactsInserted,
    contacts_updated: contactsUpdated,
    batchName,
  });
}
