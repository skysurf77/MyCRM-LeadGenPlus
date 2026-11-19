"use client";

import { useMemo, useState } from "react";
import { KanbanSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFilters, useFilterUrlSync } from "@/store/useFilters";
import { matchesDeal } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import type { FacetOption } from "@/components/FacetFilter";
import { DealCard } from "@/components/pipeline/DealCard";
import { DealDrawer } from "@/components/pipeline/DealDrawer";
import { cn, formatEuros } from "@/lib/utils";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  type DealStage,
  type DealWithRelations,
  type ScrapeBatch,
} from "@/lib/types";

const STAGE_ACCENT: Record<DealStage, string> = {
  to_contact: "bg-muted-foreground/40",
  outreach_sent: "bg-brand",
  demo_call: "bg-tier-b",
  proposal_sent: "bg-accent",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-tier-d",
};

export function PipelineView({
  initialDeals,
  batches,
}: {
  initialDeals: DealWithRelations[];
  batches: ScrapeBatch[];
}) {
  const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [selected, setSelected] = useState<DealWithRelations | null>(null);
  const supabase = createClient();

  const filters = useFilters();
  useFilterUrlSync();

  const cityOptions = useMemo(
    () => facet(deals, (d) => d.companies?.city ?? null),
    [deals]
  );
  const categoryOptions = useMemo(
    () => facet(deals, (d) => d.companies?.category ?? null),
    [deals]
  );
  const batchOptions: FacetOption[] = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.name })),
    [batches]
  );

  const snapshot = filters.snapshot();
  const filtered = useMemo(
    () => deals.filter((d) => matchesDeal(d, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, JSON.stringify(snapshot)]
  );

  // Regroupement par colonne, les plus gros abonnements en haut.
  const byStage = useMemo(() => {
    const map = {} as Record<DealStage, DealWithRelations[]>;
    for (const s of DEAL_STAGE_ORDER) map[s] = [];
    for (const d of filtered) map[d.stage]?.push(d);
    for (const s of DEAL_STAGE_ORDER) {
      map[s].sort((a, b) => (b.mrr ?? 0) - (a.mrr ?? 0));
    }
    return map;
  }, [filtered]);

  const totalOpenMrr = useMemo(
    () =>
      filtered
        .filter((d) => d.stage !== "closed_lost" && d.stage !== "closed_won")
        .reduce((sum, d) => sum + (d.mrr ?? 0), 0),
    [filtered]
  );
  const wonMrr = useMemo(
    () =>
      filtered
        .filter((d) => d.stage === "closed_won")
        .reduce((sum, d) => sum + (d.mrr ?? 0), 0),
    [filtered]
  );

  async function refetch() {
    const { data } = await supabase
      .from("deals")
      .select("*, companies(*), contacts(*)")
      .limit(2000);
    if (data) setDeals(data as DealWithRelations[]);
  }

  async function updateDeal(id: string, patch: Partial<DealWithRelations>) {
    const previous = deals;
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    const { companies: _c, contacts: _ct, ...dbPatch } = patch as Record<string, unknown>;
    const { error } = await supabase.from("deals").update(dbPatch).eq("id", id);
    if (error) {
      setDeals(previous);
      await refetch();
    }
  }

  async function deleteDeal(id: string) {
    const previous = deals;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) setDeals(previous);
  }

  function handleDrop(stage: DealStage) {
    setDragOverStage(null);
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;
    void updateDeal(id, { stage });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 pt-4">
        <div className="pb-3">
          <h2 className="text-lg font-semibold">
            {filtered.length === deals.length
              ? `${deals.length} opportunités`
              : `${filtered.length} / ${deals.length} opportunités`}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Pipeline ouvert :{" "}
              <strong className="text-accent">{formatEuros(totalOpenMrr)}/mois</strong>
            </span>
            <span>·</span>
            <span>
              Gagné : <strong className="text-emerald-600">{formatEuros(wonMrr)}/mois</strong>
            </span>
          </div>
        </div>
      </div>

      <FilterBar
        cities={cityOptions}
        categories={categoryOptions}
        batches={batchOptions}
        searchPlaceholder="Rechercher une opportunité, une entreprise…"
      />

      {deals.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto bg-surface/60 p-4">
          <div className="flex h-full min-w-max gap-3">
            {DEAL_STAGE_ORDER.map((stage) => {
              const items = byStage[stage];
              const total = items.reduce((sum, d) => sum + (d.mrr ?? 0), 0);
              const isOver = dragOverStage === stage;
              return (
                <section
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={(e) => {
                    // Ignore les passages sur les enfants de la colonne.
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStage((s) => (s === stage ? null : s));
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(stage);
                  }}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-xl border bg-background/70 transition-colors",
                    isOver && "border-brand bg-brand-soft/60"
                  )}
                >
                  <header className="border-b px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_ACCENT[stage])}
                      />
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {DEAL_STAGE_LABELS[stage]}
                      </h3>
                      <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-accent">
                      {formatEuros(total)}/mois
                    </p>
                  </header>

                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    {items.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">
                        Déposez une carte ici
                      </p>
                    ) : (
                      items.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          dragging={draggingId === deal.id}
                          onDragStart={() => setDraggingId(deal.id)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStage(null);
                          }}
                          onClick={() => setSelected(deal)}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <DealDrawer
        deal={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateDeal}
        onDelete={deleteDeal}
      />
    </div>
  );
}

function facet(
  deals: DealWithRelations[],
  pick: (d: DealWithRelations) => string | null
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const d of deals) {
    const v = pick(d);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([value, count]) => ({ value, label: value, count }));
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <KanbanSquare className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium">Pipeline vide</p>
        <p className="text-sm text-muted-foreground">
          Ouvrez une entreprise dans l&apos;onglet Entreprises et cliquez sur
          «&nbsp;Envoyer dans le Pipeline&nbsp;» pour créer votre première opportunité.
        </p>
      </div>
    </div>
  );
}
