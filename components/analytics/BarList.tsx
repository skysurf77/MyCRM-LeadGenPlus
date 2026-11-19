"use client";

import { cn } from "@/lib/utils";

export interface BarRow {
  key: string;
  /** Libellé de la ligne (texte en tokens d'encre, jamais en couleur de donnée). */
  label: React.ReactNode;
  /** Texte brut, pour l'infobulle et le nom accessible. */
  labelText: string;
  value: number;
  /** Valeur affichée en bout de barre. */
  display: string;
  /** Complément en petit sous la barre (ex. « dont 4 en tier A »). */
  hint?: string;
  /** Couleur de la marque. Par défaut : la teinte unique de magnitude. */
  tone?: "default" | "good" | "bad";
}

const TONES: Record<NonNullable<BarRow["tone"]>, string> = {
  default: "bg-chart-1",
  good: "bg-chart-good",
  bad: "bg-chart-bad",
};

/** Barres classées, série unique : une seule teinte pour toutes les barres
 *  (la longueur porte déjà la magnitude, la couleur n'a rien à encoder de plus).
 *  Marque fine, extrémité arrondie 4px côté donnée, carrée à la ligne de base. */
export function BarList({ rows, max }: { rows: BarRow[]; max?: number }) {
  const peak = max ?? Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = peak > 0 ? (r.value / peak) * 100 : 0;
        return (
          <li
            key={r.key}
            title={`${r.labelText} : ${r.display}`}
            className="group -mx-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/60"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                {r.label}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {r.display}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-chart-grid">
              <div
                className={cn("h-full rounded-r", TONES[r.tone ?? "default"])}
                style={{ width: `${Math.max(pct, r.value > 0 ? 2 : 0)}%` }}
              />
            </div>
            {r.hint && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{r.hint}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
