"use client";

import { Search, X } from "lucide-react";
import { FacetFilter, type FacetOption } from "@/components/FacetFilter";
import { RangeFilter } from "@/components/RangeFilter";
import { useFilters } from "@/store/useFilters";
import { activeFilterCount } from "@/lib/filters";
import { cn } from "@/lib/utils";
import type { LeadTier } from "@/lib/types";

const TIERS: { tier: LeadTier; label: string; cls: string }[] = [
  { tier: "A", label: "A", cls: "data-[on=true]:bg-tier-a data-[on=true]:text-white" },
  { tier: "B", label: "B", cls: "data-[on=true]:bg-tier-b data-[on=true]:text-white" },
  { tier: "C", label: "C", cls: "data-[on=true]:bg-tier-c data-[on=true]:text-white" },
  { tier: "D", label: "D", cls: "data-[on=true]:bg-tier-d data-[on=true]:text-white" },
];

export function FilterBar({
  cities,
  categories,
  batches,
  extra,
  searchPlaceholder = "Rechercher une entreprise, ville…",
}: {
  cities: FacetOption[];
  categories: FacetOption[];
  batches: FacetOption[];
  /** Filtres propres à un onglet (ex. statut d'enrichissement sur Contacts). */
  extra?: React.ReactNode;
  searchPlaceholder?: string;
}) {
  const f = useFilters();
  const count = activeFilterCount(f.snapshot());

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-6 py-3">
      {/* Recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={f.search}
          onChange={(e) => f.setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Tiers */}
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {TIERS.map((t) => {
          const on = f.tiers.includes(t.tier);
          return (
            <button
              key={t.tier}
              type="button"
              data-on={on}
              onClick={() => f.toggleTier(t.tier)}
              className={cn(
                "h-7 w-7 rounded text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted",
                t.cls
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <FacetFilter label="Ville" options={cities} selected={f.cities} onToggle={f.toggleCity} />
      <FacetFilter
        label="Catégorie"
        options={categories}
        selected={f.categories}
        onToggle={f.toggleCategory}
      />
      <FacetFilter
        label="Campagne"
        options={batches}
        selected={f.batchId ? [f.batchId] : []}
        onToggle={(v) => f.setBatch(f.batchId === v ? null : v)}
      />

      <RangeFilter
        label="Note"
        min={f.ratingMin}
        max={f.ratingMax}
        step={0.1}
        placeholderMin="0"
        placeholderMax="5"
        onChange={(mn, mx) => f.setRange("rating", mn, mx)}
      />
      <RangeFilter
        label="Avis"
        min={f.reviewsMin}
        max={f.reviewsMax}
        placeholderMin="0"
        placeholderMax="999"
        onChange={(mn, mx) => f.setRange("reviews", mn, mx)}
      />
      <RangeFilter
        label="Score"
        min={f.scoreMin}
        max={f.scoreMax}
        placeholderMin="0"
        placeholderMax="100"
        onChange={(mn, mx) => f.setRange("score", mn, mx)}
      />

      {extra}

      {count > 0 && (
        <button
          type="button"
          onClick={f.reset}
          className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Effacer ({count})
        </button>
      )}
    </div>
  );
}
