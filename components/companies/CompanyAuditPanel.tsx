"use client";

import {
  BadgeCheck,
  CalendarClock,
  MessageSquareReply,
  Target,
  TriangleAlert,
  Building2,
} from "lucide-react";
import { formatNumber, formatRating } from "@/lib/utils";
import type { Company } from "@/lib/types";

/** Date au format fr-FR, tolérante : renvoie null si la valeur est inexploitable. */
function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Barre comparative : la fiche face à la moyenne du secteur local.
 *  Une seule teinte (--chart-1) pour la fiche, gris neutre pour la moyenne,
 *  et la valeur est TOUJOURS écrite en chiffres — aucune information n'est
 *  accessible par la seule couleur (règle dataviz du projet). */
function CompareRow({
  label,
  own,
  avg,
  max,
  format,
}: {
  label: string;
  own: number | null;
  avg: number | null;
  max: number;
  format: (n: number | null) => string;
}) {
  const pct = (v: number | null) => (v === null || max <= 0 ? 0 : Math.max(0, Math.min(100, (v / max) * 100)));
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs">Cette fiche</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct(own)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums">{format(own)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Secteur local</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-grid" style={{ width: `${pct(avg)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {format(avg)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Bloc « Audit Google & Benchmark local » du panneau 360°.
 *  Entièrement conditionnel : une fiche de seed ou issue d'un import CSV
 *  n'affiche rien du tout. */
export function CompanyAuditPanel({ company }: { company: Company }) {
  const bench = company.local_competitor_benchmark;
  const hasBadges = company.is_claimed === false || (company.multi_location_count ?? 1) > 1;
  const hasStats =
    company.owner_response_rate !== null ||
    company.reviews_last_90_days !== null ||
    company.negative_reviews_count_6m !== null ||
    company.reviews_needed_for_next_tier !== null ||
    company.last_review_date !== null;
  const hasBench =
    !!bench &&
    ((bench.avg_rating ?? null) !== null ||
      (bench.avg_reviews ?? null) !== null ||
      (bench.top_3?.length ?? 0) > 0);
  const hasIdentity =
    !!company.siren || !!company.siret || !!company.department || !!company.source || !!company.scraped_at;

  if (!hasBadges && !hasStats && !hasBench && !hasIdentity) return null;

  const responseRate = company.owner_response_rate;
  const lastReview = formatDate(company.last_review_date);
  const scrapedAt = formatDate(company.scraped_at);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Audit Google &amp; Benchmark local</h3>

      {/* Signaux immédiats */}
      {hasBadges && (
        <div className="mb-3 flex flex-wrap gap-2">
          {company.is_claimed === false && (
            <span className="inline-flex items-center gap-1 rounded-full border border-tier-d/30 bg-tier-d/15 px-2 py-0.5 text-xs font-medium text-tier-d">
              <TriangleAlert className="h-3 w-3" />
              Fiche non revendiquée
            </span>
          )}
          {(company.multi_location_count ?? 1) > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
              <Building2 className="h-3 w-3" />
              Réseau — {company.multi_location_count} établissements
            </span>
          )}
        </div>
      )}

      {hasStats && (
        <div className="space-y-3 rounded-lg border bg-surface p-3">
          {/* Taux de réponse du propriétaire */}
          {responseRate !== null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquareReply className="h-3.5 w-3.5" />
                  Réponses du propriétaire
                </span>
                <span className="font-semibold tabular-nums">{responseRate} %</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-chart-1"
                  style={{ width: `${Math.max(0, Math.min(100, responseRate))}%` }}
                />
              </div>
            </div>
          )}

          {/* Activité récente */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {company.reviews_last_90_days !== null && (
              <div>
                <p className="text-muted-foreground">Avis sur 90 jours</p>
                <p className="font-semibold tabular-nums">
                  {formatNumber(company.reviews_last_90_days)}
                </p>
              </div>
            )}
            {company.negative_reviews_count_6m !== null && (
              <div>
                <p className="text-muted-foreground">Avis négatifs (6 mois)</p>
                <p className="font-semibold tabular-nums text-tier-d">
                  {formatNumber(company.negative_reviews_count_6m)}
                </p>
              </div>
            )}
            {lastReview && (
              <div className="col-span-2">
                <p className="flex items-center gap-1 text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  Dernier avis reçu
                </p>
                <p className="font-medium">{lastReview}</p>
              </div>
            )}
          </div>

          {/* Objectif commercial concret */}
          {company.reviews_needed_for_next_tier !== null && (
            <p className="flex items-start gap-1.5 rounded-md border border-accent/30 bg-accent-soft p-2 text-xs">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                <strong className="tabular-nums">{company.reviews_needed_for_next_tier}</strong>{" "}
                avis 5&#9733; suffisent pour atteindre le palier de note suivant.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Benchmark local */}
      {hasBench && bench && (
        <div className="mt-3 space-y-3 rounded-lg border bg-surface p-3">
          <p className="text-xs font-medium">Face aux concurrents du secteur</p>
          {(bench.avg_rating ?? null) !== null && (
            <CompareRow
              label="Note Google"
              own={company.rating}
              avg={bench.avg_rating ?? null}
              max={5}
              format={(n) => formatRating(n)}
            />
          )}
          {(bench.avg_reviews ?? null) !== null && (
            <CompareRow
              label="Nombre d'avis"
              own={company.reviews_count}
              avg={bench.avg_reviews ?? null}
              max={Math.max(company.reviews_count ?? 0, bench.avg_reviews ?? 0, 1)}
              format={(n) => formatNumber(n)}
            />
          )}
          {(bench.top_3?.length ?? 0) > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-brand">
                Top 3 du secteur
              </summary>
              <ul className="mt-2 space-y-1">
                {bench.top_3!.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.name ?? "Concurrent"}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatRating(t.rating ?? null)} · {formatNumber(t.reviews ?? null)} avis
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Identité & provenance */}
      {hasIdentity && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {company.siren && <span>SIREN {company.siren}</span>}
          {company.siret && <span>SIRET {company.siret}</span>}
          {company.department && <span>Dép. {company.department}</span>}
          {company.source && (
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" />
              {company.source}
            </span>
          )}
          {scrapedAt && <span>Scrapé le {scrapedAt}</span>}
        </p>
      )}
    </section>
  );
}
