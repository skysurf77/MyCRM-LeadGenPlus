import { cn } from "@/lib/utils";
import { EMAIL_VERIFICATION_LABELS, type EmailVerificationStatus } from "@/lib/types";

const STYLES: Record<EmailVerificationStatus, string> = {
  valid: "bg-tier-c/15 text-tier-c border-tier-c/30",
  catch_all: "bg-tier-b/15 text-tier-b border-tier-b/30",
  invalid: "bg-tier-d/15 text-tier-d border-tier-d/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

/** Fiabilité de l'adresse e-mail livrée par l'enrichissement.
 *  Même pastille que `EnrichmentBadge` pour rester lisible côte à côte. */
export function EmailVerificationBadge({
  status,
  className,
}: {
  status: EmailVerificationStatus;
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
      {EMAIL_VERIFICATION_LABELS[status]}
    </span>
  );
}
