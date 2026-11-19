import { cn } from "@/lib/utils";
import type { LeadTier } from "@/lib/types";

const TIER_STYLES: Record<LeadTier, string> = {
  A: "bg-tier-a/15 text-tier-a border-tier-a/30",
  B: "bg-tier-b/15 text-tier-b border-tier-b/30",
  C: "bg-tier-c/15 text-tier-c border-tier-c/30",
  D: "bg-tier-d/15 text-tier-d border-tier-d/30",
};

export function TierBadge({
  tier,
  score,
  className,
}: {
  tier: LeadTier;
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        TIER_STYLES[tier],
        className
      )}
    >
      {tier}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
