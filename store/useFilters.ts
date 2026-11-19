"use client";

// Store de filtre unifié (Zustand). Partagé par tous les onglets du CRM.
// Synchronisé avec l'URL pour des liens partageables.

import { useEffect } from "react";
import { create } from "zustand";
import {
  EMPTY_FILTERS,
  filtersToParams,
  paramsToFilters,
  type FiltersState,
} from "@/lib/filters";
import type { EnrichmentStatus, LeadTier } from "@/lib/types";

interface FiltersStore extends FiltersState {
  setSearch: (v: string) => void;
  toggleTier: (t: LeadTier) => void;
  toggleCity: (c: string) => void;
  toggleCategory: (c: string) => void;
  toggleEnrichment: (s: EnrichmentStatus) => void;
  setBatch: (id: string | null) => void;
  setRange: (
    key: "rating" | "reviews" | "score",
    min: number | null,
    max: number | null
  ) => void;
  hydrate: (f: Partial<FiltersState>) => void;
  reset: () => void;
  snapshot: () => FiltersState;
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export const useFilters = create<FiltersStore>((set, get) => ({
  ...EMPTY_FILTERS,

  setSearch: (v) => set({ search: v }),
  toggleTier: (t) => set((s) => ({ tiers: toggle(s.tiers, t) })),
  toggleCity: (c) => set((s) => ({ cities: toggle(s.cities, c) })),
  toggleCategory: (c) => set((s) => ({ categories: toggle(s.categories, c) })),
  toggleEnrichment: (e) =>
    set((s) => ({ enrichmentStatuses: toggle(s.enrichmentStatuses, e) })),
  setBatch: (id) => set({ batchId: id }),
  setRange: (key, min, max) => {
    if (key === "rating") set({ ratingMin: min, ratingMax: max });
    else if (key === "reviews") set({ reviewsMin: min, reviewsMax: max });
    else set({ scoreMin: min, scoreMax: max });
  },
  hydrate: (f) => set(f),
  reset: () => set({ ...EMPTY_FILTERS }),
  snapshot: () => {
    const s = get();
    return {
      search: s.search,
      cities: s.cities,
      categories: s.categories,
      tiers: s.tiers,
      batchId: s.batchId,
      ratingMin: s.ratingMin,
      ratingMax: s.ratingMax,
      reviewsMin: s.reviewsMin,
      reviewsMax: s.reviewsMax,
      scoreMin: s.scoreMin,
      scoreMax: s.scoreMax,
      enrichmentStatuses: s.enrichmentStatuses,
    };
  },
}));

// Lit les filtres initiaux depuis l'URL (appelé au montage).
export function readFiltersFromUrl(): FiltersState {
  if (typeof window === "undefined") return { ...EMPTY_FILTERS };
  return paramsToFilters(new URLSearchParams(window.location.search));
}

// Pousse les filtres courants dans l'URL sans recharger la page.
export function writeFiltersToUrl(f: FiltersState) {
  if (typeof window === "undefined") return;
  const params = filtersToParams(f);
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

/** Branche une vue sur le filtrage unifié : hydrate depuis l'URL au montage,
 *  puis réécrit l'URL à chaque changement (liens partageables + conservation
 *  des filtres d'un onglet à l'autre, via les liens de la barre latérale). */
export function useFilterUrlSync() {
  useEffect(() => {
    useFilters.getState().hydrate(readFiltersFromUrl());
    return useFilters.subscribe(() =>
      writeFiltersToUrl(useFilters.getState().snapshot())
    );
  }, []);
}
