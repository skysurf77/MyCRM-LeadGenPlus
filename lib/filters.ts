// Filtrage unifié — source de vérité partagée par tous les onglets du CRM.
// `companies` est l'entité racine : Contacts / Deals / Tasks se filtrent via
// l'entreprise liée, donc un filtre "ville" ou "tier" cascade partout.

import type {
  Company,
  ContactWithCompany,
  DealWithRelations,
  EnrichmentStatus,
  LeadTier,
  TaskWithRelations,
} from "@/lib/types";
import { contactName } from "@/lib/types";

export interface FiltersState {
  search: string;
  cities: string[];
  categories: string[];
  tiers: LeadTier[];
  batchId: string | null;
  ratingMin: number | null;
  ratingMax: number | null;
  reviewsMin: number | null;
  reviewsMax: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  /** Dimension propre à l'onglet Contacts (ignorée par les autres vues). */
  enrichmentStatuses: EnrichmentStatus[];
}

export const EMPTY_FILTERS: FiltersState = {
  search: "",
  cities: [],
  categories: [],
  tiers: [],
  batchId: null,
  ratingMin: null,
  ratingMax: null,
  reviewsMin: null,
  reviewsMax: null,
  scoreMin: null,
  scoreMax: null,
  enrichmentStatuses: [],
};

export function isFilterActive(f: FiltersState): boolean {
  return (
    f.search.trim() !== "" ||
    f.cities.length > 0 ||
    f.categories.length > 0 ||
    f.tiers.length > 0 ||
    f.batchId !== null ||
    f.ratingMin !== null ||
    f.ratingMax !== null ||
    f.reviewsMin !== null ||
    f.reviewsMax !== null ||
    f.scoreMin !== null ||
    f.scoreMax !== null ||
    f.enrichmentStatuses.length > 0
  );
}

export function activeFilterCount(f: FiltersState): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.cities.length) n++;
  if (f.categories.length) n++;
  if (f.tiers.length) n++;
  if (f.batchId) n++;
  if (f.ratingMin !== null || f.ratingMax !== null) n++;
  if (f.reviewsMin !== null || f.reviewsMax !== null) n++;
  if (f.scoreMin !== null || f.scoreMax !== null) n++;
  if (f.enrichmentStatuses.length) n++;
  return n;
}

function haystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** Dimensions « entreprise » hors recherche texte. Réutilisé par les vues
 *  Contacts et Pipeline pour faire cascader le filtre via l'entreprise liée. */
export function matchesCompanyFacets(c: Company, f: FiltersState): boolean {
  if (f.cities.length && (!c.city || !f.cities.includes(c.city))) return false;
  if (f.categories.length && (!c.category || !f.categories.includes(c.category)))
    return false;
  if (f.tiers.length && !f.tiers.includes(c.lead_tier)) return false;
  if (f.batchId && c.batch_id !== f.batchId) return false;

  if (f.ratingMin !== null && (c.rating ?? -1) < f.ratingMin) return false;
  if (f.ratingMax !== null && (c.rating ?? Infinity) > f.ratingMax) return false;

  if (f.reviewsMin !== null && (c.reviews_count ?? -1) < f.reviewsMin) return false;
  if (f.reviewsMax !== null && (c.reviews_count ?? Infinity) > f.reviewsMax)
    return false;

  if (f.scoreMin !== null && c.lead_score < f.scoreMin) return false;
  if (f.scoreMax !== null && c.lead_score > f.scoreMax) return false;

  return true;
}

// Prédicat central : une entreprise passe-t-elle le filtre courant ?
export function matchesCompany(c: Company, f: FiltersState): boolean {
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    if (!haystack([c.name, c.city, c.category, c.address]).includes(q)) return false;
  }
  return matchesCompanyFacets(c, f);
}

/** Un contact passe le filtre si son entreprise passe les facettes, si son
 *  statut d'enrichissement est retenu, et si la recherche texte matche soit le
 *  contact lui-même, soit son entreprise. */
export function matchesContact(ct: ContactWithCompany, f: FiltersState): boolean {
  const co = ct.companies;
  if (!co) return false;
  if (!matchesCompanyFacets(co, f)) return false;
  if (
    f.enrichmentStatuses.length &&
    !f.enrichmentStatuses.includes(ct.enrichment_status)
  )
    return false;

  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const hay = haystack([
      contactName(ct),
      ct.title,
      ct.email,
      ct.phone,
      co.name,
      co.city,
      co.category,
    ]);
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Idem pour une opportunité du Pipeline. */
export function matchesDeal(d: DealWithRelations, f: FiltersState): boolean {
  const co = d.companies;
  if (!co) return false;
  if (!matchesCompanyFacets(co, f)) return false;

  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const hay = haystack([
      d.title,
      co.name,
      co.city,
      co.category,
      d.contacts ? contactName(d.contacts) : null,
    ]);
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Une tâche passe le filtre via l'entreprise liée. Une tâche sans entreprise
 *  (rappel interne) reste visible tant qu'aucune facette entreprise n'est
 *  active — sinon elle ne peut pas, par construction, y répondre. */
export function matchesTask(t: TaskWithRelations, f: FiltersState): boolean {
  const co = t.companies;

  if (co) {
    if (!matchesCompanyFacets(co, f)) return false;
  } else if (
    f.cities.length ||
    f.categories.length ||
    f.tiers.length ||
    f.batchId ||
    f.ratingMin !== null ||
    f.ratingMax !== null ||
    f.reviewsMin !== null ||
    f.reviewsMax !== null ||
    f.scoreMin !== null ||
    f.scoreMax !== null
  ) {
    return false;
  }

  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    const hay = haystack([
      t.title,
      co?.name,
      co?.city,
      co?.category,
      t.contacts ? contactName(t.contacts) : null,
    ]);
    if (!hay.includes(q)) return false;
  }
  return true;
}

// ---- Sérialisation URL (liens partageables) ------------------------------

export function filtersToParams(f: FiltersState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set("q", f.search.trim());
  if (f.cities.length) p.set("cities", f.cities.join(","));
  if (f.categories.length) p.set("cats", f.categories.join(","));
  if (f.tiers.length) p.set("tiers", f.tiers.join(","));
  if (f.batchId) p.set("batch", f.batchId);
  if (f.ratingMin !== null) p.set("rmin", String(f.ratingMin));
  if (f.ratingMax !== null) p.set("rmax", String(f.ratingMax));
  if (f.reviewsMin !== null) p.set("avmin", String(f.reviewsMin));
  if (f.reviewsMax !== null) p.set("avmax", String(f.reviewsMax));
  if (f.scoreMin !== null) p.set("smin", String(f.scoreMin));
  if (f.scoreMax !== null) p.set("smax", String(f.scoreMax));
  if (f.enrichmentStatuses.length) p.set("enr", f.enrichmentStatuses.join(","));
  return p;
}

function num(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function paramsToFilters(p: URLSearchParams): FiltersState {
  const list = (key: string): string[] => {
    const v = p.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  };
  return {
    search: p.get("q") ?? "",
    cities: list("cities"),
    categories: list("cats"),
    tiers: list("tiers") as LeadTier[],
    batchId: p.get("batch"),
    ratingMin: num(p.get("rmin")),
    ratingMax: num(p.get("rmax")),
    reviewsMin: num(p.get("avmin")),
    reviewsMax: num(p.get("avmax")),
    scoreMin: num(p.get("smin")),
    scoreMax: num(p.get("smax")),
    enrichmentStatuses: list("enr") as EnrichmentStatus[],
  };
}
