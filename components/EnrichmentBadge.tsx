import { cn } from "@/lib/utils";
import { ENRICHMENT_LABELS, type EnrichmentStatus } from "@/lib/types";

const STYLES: Record<EnrichmentStatus, string> = {
  a_enrichir: "bg-muted text-muted-foreground border-border",
  en_cours: "bg-tier-b/15 text-tier-b border-tier-b/30",
  enrichi: "bg-tier-c/15 text-tier-c border-tier-c/30",
  echec: "bg-tier-d/15 text-tier-d border-tier-d/30",
};

export function EnrichmentBadge({
  status,
  className,
}: {
  status: EnrichmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
        className
      )}
    >
      {ENRICHMENT_LABELS[status]}
    </span>
  );
}
