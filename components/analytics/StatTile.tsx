import { cn } from "@/lib/utils";

/** Carte de KPI. Le nombre est la visualisation : pas de graphique à une barre.
 *  Chiffres proportionnels (pas de `tabular-nums` sur une grande valeur isolée). */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "accent";
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold leading-tight",
          tone === "good" && "text-chart-good",
          tone === "accent" && "text-accent"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
