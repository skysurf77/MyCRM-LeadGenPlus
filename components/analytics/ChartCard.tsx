"use client";

import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Carte de graphique avec son jumeau « vue tableau ».
 *  Chaque graphique en a un : aucune valeur n'est accessible par la seule couleur
 *  ou le seul survol. */
export function ChartCard({
  title,
  subtitle,
  columns,
  rows,
  empty,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  /** En-têtes de la vue tableau. */
  columns: string[];
  /** Lignes de la vue tableau (déjà formatées). */
  rows: string[][];
  empty?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [tableView, setTableView] = useState(false);
  const isEmpty = rows.length === 0;

  return (
    <section className={cn("rounded-xl border bg-background p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setTableView((v) => !v)}
            title={tableView ? "Voir le graphique" : "Voir le tableau de valeurs"}
            aria-pressed={tableView}
            className="shrink-0 rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {tableView ? (
              <BarChart3 className="h-3.5 w-3.5" />
            ) : (
              <Table2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {empty ?? "Aucune donnée pour ce filtre."}
        </p>
      ) : tableView ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((c, i) => (
                  <th
                    key={c}
                    className={cn(
                      "py-1.5 text-xs font-semibold text-muted-foreground",
                      i === 0 ? "text-left" : "text-right"
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} className="border-b last:border-0">
                  {r.map((cell, i) => (
                    <td
                      key={i}
                      className={cn(
                        "py-1.5",
                        i === 0
                          ? "text-left"
                          : "text-right tabular-nums text-muted-foreground"
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
