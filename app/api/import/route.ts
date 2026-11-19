import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeScore } from "@/lib/scoring";

export const runtime = "nodejs";

// ---- Rate limiting en mémoire (checklist secure.md) ----------------------
const RATE_MAX = Number(process.env.IMPORT_RATE_LIMIT_MAX ?? 20);
const RATE_WINDOW = Number(process.env.IMPORT_RATE_LIMIT_WINDOW_SECONDS ?? 600) * 1000;
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

// ---- Mapping tolérant des colonnes ---------------------------------------
const ALIASES: Record<string, string[]> = {
  name: ["name", "title", "companyname", "nom", "entreprise"],
  category: ["category", "categoryname", "type", "categorie", "secteur"],
  address: ["address", "street", "adresse", "fulladdress"],
  city: ["city", "ville"],
  postal_code: ["postal_code", "postalcode", "zip", "cp", "code_postal"],
  phone: ["phone", "phonenumber", "telephone", "tel"],
  website: ["website", "site", "url", "web"],
  google_maps_url: ["google_maps_url", "mapsurl", "url_maps", "googleurl", "maps_url"],
  place_id: ["place_id", "placeid", "cid", "fid", "google_place_id"],
  rating: ["rating", "note", "stars", "averagerating", "totalscore"],
  reviews_count: ["reviews_count", "reviewscount", "reviews", "userratingcount", "nb_avis", "avis", "reviewcount"],
};

function pick(row: Record<string, any>, aliases: string[]): string | null {
  const lowerKeys: Record<string, any> = {};
  for (const k of Object.keys(row)) lowerKeys[k.toLowerCase().trim()] = row[k];
  for (const a of aliases) {
    const v = lowerKeys[a];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function toNumber(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

const bodySchema = z.object({
  format: z.enum(["csv", "json"]),
  content: z.string().min(1).max(10_000_000),
  batchName: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  // 1. Authentification (la route est hors du middleware)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // 2. Rate limiting
  const rl = rateLimit(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez plus tard." },
      { status: 429, headers: { "X-RateLimit-Limit": String(RATE_MAX), "X-RateLimit-Remaining": "0" } }
    );
  }

  // 3. Validation du corps
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // 4. Parsing du contenu
  let rawRows: Record<string, any>[];
  try {
    if (parsed.format === "json") {
      const data = JSON.parse(parsed.content);
      rawRows = Array.isArray(data) ? data : data.results ?? data.data ?? [];
      if (!Array.isArray(rawRows)) throw new Error("JSON inattendu");
    } else {
      const res = Papa.parse<Record<string, any>>(parsed.content, {
        header: true,
        skipEmptyLines: true,
      });
      rawRows = res.data;
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Impossible de lire le fichier : ${e?.message ?? "format invalide"}` },
      { status: 400 }
    );
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne trouvée dans le fichier." }, { status: 400 });
  }
  if (rawRows.length > 20000) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 000 lignes)." }, { status: 400 });
  }

  // 5. Normalisation + scoring
  const errors: string[] = [];
  const valid: any[] = [];
  const seenPlaceIds = new Set<string>();

  rawRows.forEach((row, i) => {
    const name = pick(row, ALIASES.name);
    if (!name) {
      errors.push(`Ligne ${i + 1} : nom manquant.`);
      return;
    }
    const rating = toNumber(pick(row, ALIASES.rating));
    const reviews = toNumber(pick(row, ALIASES.reviews_count));
    const website = pick(row, ALIASES.website);
    const phone = pick(row, ALIASES.phone);
    const category = pick(row, ALIASES.category);
    let placeId = pick(row, ALIASES.place_id);

    // Déduplication intra-fichier
    if (placeId) {
      if (seenPlaceIds.has(placeId)) {
        errors.push(`Ligne ${i + 1} : doublon de place_id dans le fichier (${placeId}).`);
        return;
      }
      seenPlaceIds.add(placeId);
    }

    const score = computeScore({
      rating,
      reviews_count: reviews ? Math.round(reviews) : null,
      website,
      phone,
      category,
    });

    valid.push({
      name,
      category,
      address: pick(row, ALIASES.address),
      city: pick(row, ALIASES.city),
      postal_code: pick(row, ALIASES.postal_code),
      phone,
      website,
      gbp_url: pick(row, ALIASES.google_maps_url),
      google_place_id: placeId,
      rating,
      reviews_count: reviews ? Math.round(reviews) : null,
      lead_score: score.lead_score,
      lead_tier: score.lead_tier,
      score_breakdown: score.score_breakdown,
    });
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne valide à importer.", errors },
      { status: 400 }
    );
  }

  // 6. Écriture (service role, hors RLS) — mais auth déjà vérifiée ci-dessus
  const admin = createAdminClient();

  // Détermine inserts vs updates pour le rapport
  const placeIds = valid.map((v) => v.google_place_id).filter(Boolean) as string[];
  let existing = new Set<string>();
  if (placeIds.length > 0) {
    const { data: ex } = await admin
      .from("companies")
      .select("google_place_id")
      .in("google_place_id", placeIds);
    existing = new Set((ex ?? []).map((r: any) => r.google_place_id));
  }
  const updated = valid.filter((v) => v.google_place_id && existing.has(v.google_place_id)).length;
  const inserted = valid.length - updated;

  // Crée la campagne
  const batchName = parsed.batchName?.trim() || `Import ${new Date().toLocaleString("fr-FR")}`;
  const { data: batch, error: batchErr } = await admin
    .from("scrape_batches")
    .insert({ name: batchName, source: "google_maps", rows_count: valid.length, imported_by: user.id })
    .select("id")
    .single();

  if (batchErr) {
    return NextResponse.json({ error: `Erreur création campagne : ${batchErr.message}` }, { status: 500 });
  }

  const rowsToUpsert = valid.map((v) => ({ ...v, batch_id: batch.id }));

  const { error: upsertErr } = await admin
    .from("companies")
    .upsert(rowsToUpsert, { onConflict: "google_place_id", ignoreDuplicates: false });

  if (upsertErr) {
    return NextResponse.json({ error: `Erreur import : ${upsertErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    inserted,
    updated,
    skipped: errors.length,
    errors,
    batchName,
  });
}
