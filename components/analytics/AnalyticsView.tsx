"use client";

import { useMemo } from "react";
import { useFilters, useFilterUrlSync } from "@/store/useFilters";
import { matchesCompany, matchesContact, matchesDeal } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import type { FacetOption } from "@/components/FacetFilter";
import { TierBadge } from "@/components/TierBadge";
import { StatTile } from "@/components/analytics/StatTile";
import { ChartCard } from "@/components/analytics/ChartCard";
import { BarList, type BarRow } from "@/components/analytics/BarList";
import { formatEuros, formatNumber } from "@/lib/utils";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  LIFECYCLE_LABELS,
  type Company,
  type ContactWithCompany,
  type DealStage,
  type DealWithRelations,
  type LeadTier,
  type LifecycleStatus,
  type ScrapeBatch,
} from "@/lib/types";

const TIERS: LeadTier[] = ["A", "B", "C", "D"];
const OPEN_STAGES: DealStage[] = DEAL_STAGE_ORDER.filter(
  (s) => s !== "closed_won" && s !== "closed_lost"
);
const TOP_N = 8;

export function AnalyticsView({
  companies,
  deals,
  contacts,
  batches,
}: {
  companies: Company[];
  deals: DealWithRelations[];
  contacts: ContactWithCompany[];
  batches: ScrapeBatch[];
}) {
  const filters = useFilters();
  useFilterUrlSync();

  const snapshot = filters.snapshot();

  const fCompanies = useMemo(
    () => companies.filter((c) => matchesCompany(c, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, JSON.stringify(snapshot)]
  );
  const fDeals = useMemo(
    () => deals.filter((d) => matchesDeal(d, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, JSON.stringify(snapshot)]
  );
  const fContacts = useMemo(
    () => contacts.filter((c) => matchesContact(c, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, JSON.stringify(snapshot)]
  );

  // ---- Facettes (mêmes options que les autres onglets) --------------------
  const cityOptions = useMemo(() => facet(companies, (c) => c.city), [companies]);
  const categoryOptions = useMemo(
    () => facet(companies, (c) => c.category),
    [companies]
  );
  const batchOptions: FacetOption[] = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.name })),
    [batches]
  );

  // ---- KPIs ---------------------------------------------------------------
  const tierCounts = useMemo(() => {
    const m: Record<LeadTier, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const c of fCompanies) m[c.lead_tier]++;
    return m;
  }, [fCompanies]);

  const enrichedContacts = fContacts.filter((c) => c.enrichment_status === "enrichi");
  const openMrr = sum(
    fDeals.filter((d) => OPEN_STAGES.includes(d.stage)).map((d) => d.mrr ?? 0)
  );
  const wonMrr = sum(
    fDeals.filter((d) => d.stage === "closed_won").map((d) => d.mrr ?? 0)
  );
  const wonCount = fDeals.filter((d) => d.stage === "closed_won").length;
  const closedCount =
    wonCount + fDeals.filter((d) => d.stage === "closed_lost").length;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : null;

  // ---- Entonnoir de conversion -------------------------------------------
  const funnel: BarRow[] = useMemo(
    () =>
      DEAL_STAGE_ORDER.map((stage) => {
        const items = fDeals.filter((d) => d.stage === stage);
        const mrr = sum(items.map((d) => d.mrr ?? 0));
        return {
          key: stage,
          label: <span className="truncate">{DEAL_STAGE_LABELS[stage]}</span>,
          labelText: DEAL_STAGE_LABELS[stage],
          value: items.length,
          display: `${items.length} · ${formatEuros(mrr)}/mois`,
          tone:
            stage === "closed_won"
              ? ("good" as const)
              : stage === "closed_lost"
                ? ("bad" as const)
                : ("default" as const),
        };
      }),
    [fDeals]
  );

  // ---- Répartition par tier ----------------------------------------------
  const tierRows: BarRow[] = TIERS.map((t) => ({
    key: t,
    label: <TierBadge tier={t} />,
    labelText: `Tier ${t}`,
    value: tierCounts[t],
    display: formatNumber(tierCounts[t]),
    hint: pctHint(tierCounts[t], fCompanies.length),
  }));

  // ---- Répartition par statut de prospection ------------------------------
  const lifecycleRows: BarRow[] = useMemo(() => {
    const keys = Object.keys(LIFECYCLE_LABELS) as LifecycleStatus[];
    return keys.map((k) => {
      const n = fCompanies.filter((c) => c.lifecycle_status === k).length;
      return {
        key: k,
        label: <span>{LIFECYCLE_LABELS[k]}</span>,
        labelText: LIFECYCLE_LABELS[k],
        value: n,
        display: formatNumber(n),
        hint: pctHint(n, fCompanies.length),
      };
    });
  }, [fCompanies]);

  // ---- Performance par catégorie / ville ----------------------------------
  const categoryRows = useMemo(
    () => dimensionRows(fCompanies, (c) => c.category),
    [fCompanies]
  );
  const cityRows = useMemo(() => dimensionRows(fCompanies, (c) => c.city), [fCompanies]);

  // ---- Suivi par campagne d'acquisition -----------------------------------
  const batchRows: BarRow[] = useMemo(() => {
    const byId = new Map(batches.map((b) => [b.id, b.name]));
    const counts = new Map<string, { total: number; a: number }>();
    for (const c of fCompanies) {
      const key = c.batch_id ?? "__none__";
      const entry = counts.get(key) ?? { total: 0, a: 0 };
      entry.total++;
      if (c.lead_tier === "A") entry.a++;
      counts.set(key, entry);
    }
    return Array.from(counts.entries())
      .sort((x, y) => y[1].total - x[1].total)
      .map(([id, v]) => {
        const name = id === "__none__" ? "Hors campagne" : (byId.get(id) ?? "Campagne supprimée");
        return {
          key: id,
          label: <span className="truncate">{name}</span>,
          labelText: name,
          value: v.total,
          display: formatNumber(v.total),
          hint: `${v.a} lead${v.a > 1 ? "s" : ""} en tier A · ${pctHint(v.a, v.total) ?? "0 %"} de chauds`,
        };
      });
  }, [fCompanies, batches]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background px-6 pt-4">
        <div className="pb-3">
          <h2 className="text-lg font-semibold">Pilotage</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {fCompanies.length === companies.length
              ? "Vue d'ensemble sur l'intégralité de la base."
              : `Vue restreinte au filtre courant : ${fCompanies.length} entreprise${fCompanies.length > 1 ? "s" : ""} sur ${companies.length}.`}
          </p>
        </div>
      </div>

      {/* Une seule barre de filtre, au-dessus de tout ce qu'elle cadre. */}
      <FilterBar
        cities={cityOptions}
        categories={categoryOptions}
        batches={batchOptions}
        searchPlaceholder="Restreindre le périmètre…"
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface/60 p-4">
        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            label="Entreprises"
            value={formatNumber(fCompanies.length)}
            hint={`${tierCounts.A} en tier A`}
          />
          <StatTile
            label="Contacts enrichis"
            value={formatNumber(enrichedContacts.length)}
            hint={`sur ${formatNumber(fContacts.length)} contacts`}
          />
          <StatTile
            label="MRR en cours"
            value={`${formatEuros(openMrr)}/mois`}
            hint={`${fDeals.filter((d) => OPEN_STAGES.includes(d.stage)).length} opportunités ouvertes`}
            tone="accent"
          />
          <StatTile
            label="MRR signé"
            value={`${formatEuros(wonMrr)}/mois`}
            hint={`${wonCount} affaire${wonCount > 1 ? "s" : ""} gagnée${wonCount > 1 ? "s" : ""}`}
            tone="good"
          />
          <StatTile
            label="Taux de closing"
            value={winRate === null ? "—" : `${winRate} %`}
            hint={
              closedCount === 0
                ? "Aucune affaire clôturée"
                : `${wonCount} gagnée(s) / ${closedCount} clôturée(s)`
            }
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard
            title="Entonnoir de conversion"
            subtitle="Nombre d'opportunités et abonnement mensuel cumulé par étape."
            columns={["Étape", "Opportunités", "MRR / mois"]}
            rows={DEAL_STAGE_ORDER.map((stage) => {
              const items = fDeals.filter((d) => d.stage === stage);
              return [
                DEAL_STAGE_LABELS[stage],
                String(items.length),
                formatEuros(sum(items.map((d) => d.mrr ?? 0))),
              ];
            })}
            empty="Aucune opportunité dans ce périmètre."
          >
            <BarList rows={funnel} />
          </ChartCard>

          <ChartCard
            title="Répartition par tier de score"
            subtitle="Potentiel d'amélioration estimé des fiches Google."
            columns={["Tier", "Entreprises", "Part"]}
            rows={TIERS.map((t) => [
              `Tier ${t}`,
              String(tierCounts[t]),
              pctHint(tierCounts[t], fCompanies.length) ?? "0 %",
            ])}
          >
            <BarList rows={tierRows} />
          </ChartCard>

          <ChartCard
            title="Statut de prospection"
            subtitle="Où en sont les fiches dans le cycle commercial."
            columns={["Statut", "Entreprises", "Part"]}
            rows={lifecycleRows.map((r) => [
              r.labelText,
              String(r.value),
              r.hint ?? "0 %",
            ])}
          >
            <BarList rows={lifecycleRows} />
          </ChartCard>

          <ChartCard
            title="Suivi par campagne d'acquisition"
            subtitle="Volume et qualité des leads produits par chaque scraping."
            columns={["Campagne", "Entreprises", "Tier A"]}
            rows={batchRows.map((r) => [
              r.labelText,
              String(r.value),
              (r.hint ?? "").split(" ")[0],
            ])}
          >
            <BarList rows={batchRows} />
          </ChartCard>

          <ChartCard
            title="Performance par catégorie"
            subtitle={`Les ${TOP_N} secteurs les plus représentés.`}
            columns={["Catégorie", "Entreprises", "Score moyen"]}
            rows={categoryRows.map((r) => [
              r.labelText,
              String(r.value),
              (r.hint ?? "").replace("Score moyen ", ""),
            ])}
          >
            <BarList rows={categoryRows} />
          </ChartCard>

          <ChartCard
            title="Performance par ville"
            subtitle={`Les ${TOP_N} villes les plus représentées.`}
            columns={["Ville", "Entreprises", "Score moyen"]}
            rows={cityRows.map((r) => [
              r.labelText,
              String(r.value),
              (r.hint ?? "").replace("Score moyen ", ""),
            ])}
          >
            <BarList rows={cityRows} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ---- Helpers --------------------------------------------------------------

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

function pctHint(n: number, total: number): string | undefined {
  if (total === 0) return undefined;
  return `${Math.round((n / total) * 100)} %`;
}

/** Classement d'une dimension nominale : une teinte unique, le reste en
 *  « Autres » plutôt que de générer des couleurs au-delà du 8e rang. */
function dimensionRows(
  companies: Company[],
  pick: (c: Company) => string | null
): BarRow[] {
  const groups = new Map<string, Company[]>();
  for (const c of companies) {
    const v = pick(c);
    if (!v) continue;
    const list = groups.get(v) ?? [];
    list.push(c);
    groups.set(v, list);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  const head = sorted.slice(0, TOP_N);
  const tail = sorted.slice(TOP_N);

  const rows: BarRow[] = head.map(([name, items]) => ({
    key: name,
    label: <span className="truncate">{name}</span>,
    labelText: name,
    value: items.length,
    display: formatNumber(items.length),
    hint: `Score moyen ${avgScore(items)}`,
  }));

  if (tail.length > 0) {
    const rest = tail.flatMap(([, items]) => items);
    rows.push({
      key: "__other__",
      label: <span className="text-muted-foreground">Autres ({tail.length})</span>,
      labelText: `Autres (${tail.length})`,
      value: rest.length,
      display: formatNumber(rest.length),
      hint: `Score moyen ${avgScore(rest)}`,
    });
  }
  return rows;
}

function avgScore(items: Company[]): number {
  if (items.length === 0) return 0;
  return Math.round(sum(items.map((c) => c.lead_score)) / items.length);
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
