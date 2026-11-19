"use client";

import { useMemo, useState } from "react";
import { Upload, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFilters, useFilterUrlSync } from "@/store/useFilters";
import { matchesCompany } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { CompanyDrawer } from "@/components/companies/CompanyDrawer";
import { ImportModal } from "@/components/companies/ImportModal";
import type { FacetOption } from "@/components/FacetFilter";
import type { Company, LeadTier, ScrapeBatch } from "@/lib/types";

const COMPANY_SELECT = "*, scrape_batches(name)";
const TIER_ORDER: LeadTier[] = ["A", "B", "C", "D"];
const TIER_COLORS: Record<LeadTier, string> = {
  A: "bg-tier-a",
  B: "bg-tier-b",
  C: "bg-tier-c",
  D: "bg-tier-d",
};

export function CompaniesView({
  initialCompanies,
  batches,
}: {
  initialCompanies: Company[];
  batches: ScrapeBatch[];
}) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [selected, setSelected] = useState<Company | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const supabase = createClient();

  const filters = useFilters();
  useFilterUrlSync();

  // Options de facettes (avec comptes), dérivées de toutes les entreprises.
  const cityOptions = useMemo(() => facet(companies, (c) => c.city), [companies]);
  const categoryOptions = useMemo(() => facet(companies, (c) => c.category), [companies]);
  const batchOptions: FacetOption[] = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.name })),
    [batches]
  );

  const snapshot = filters.snapshot();
  const filtered = useMemo(
    () => companies.filter((c) => matchesCompany(c, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, JSON.stringify(snapshot)]
  );

  const tierCounts = useMemo(() => {
    const counts: Record<LeadTier, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const c of filtered) counts[c.lead_tier]++;
    return counts;
  }, [filtered]);

  async function refetch() {
    const { data } = await supabase
      .from("companies")
      .select(COMPANY_SELECT)
      .order("lead_score", { ascending: false })
      .limit(2000);
    if (data) setCompanies(data as Company[]);
  }

  async function updateCompany(id: string, patch: Partial<Company>) {
    // Mise à jour optimiste
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { scrape_batches, ...dbPatch } = patch as any;
    const { error } = await supabase.from("companies").update(dbPatch).eq("id", id);
    if (error) {
      // Rollback par rechargement en cas d'échec
      await refetch();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* En-tête de l'onglet */}
      <div className="flex items-center justify-between border-b bg-background px-6 pt-4">
        <div className="pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {filtered.length === companies.length
                ? `${companies.length} entreprises`
                : `${filtered.length} / ${companies.length} entreprises`}
            </h2>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {TIER_ORDER.map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${TIER_COLORS[t]}`} />
                {t} · {tierCounts[t]}
              </span>
            ))}
          </div>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Importer des leads
        </Button>
      </div>

      <FilterBar cities={cityOptions} categories={categoryOptions} batches={batchOptions} />

      {filtered.length === 0 ? (
        <EmptyState hasData={companies.length > 0} onImport={() => setImportOpen(true)} />
      ) : (
        <div className="min-h-0 flex-1">
          <CompaniesTable
            data={filtered}
            onRowClick={setSelected}
            onInlineUpdate={updateCompany}
          />
        </div>
      )}

      <CompanyDrawer
        company={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateCompany}
      />

      <ImportModal open={importOpen} onOpenChange={setImportOpen} onImported={refetch} />
    </div>
  );
}

function facet(companies: Company[], pick: (c: Company) => string | null): FacetOption[] {
  const counts = new Map<string, number>();
  for (const c of companies) {
    const v = pick(c);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([value, count]) => ({ value, label: value, count }));
}

function EmptyState({ hasData, onImport }: { hasData: boolean; onImport: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Building2 className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium">
          {hasData ? "Aucune entreprise ne correspond aux filtres" : "Aucune entreprise"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasData
            ? "Ajustez ou effacez les filtres pour voir plus de résultats."
            : "Importez votre premier fichier de leads scrapés pour démarrer."}
        </p>
      </div>
      {!hasData && (
        <Button onClick={onImport}>
          <Upload className="h-4 w-4" /> Importer des leads
        </Button>
      )}
    </div>
  );
}
