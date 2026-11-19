"use client";

import { Clock, Compass, MessageSquareWarning, PhoneCall, Sparkles } from "lucide-react";
import type { Company } from "@/lib/types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Bloc « Préparation d'appel & Outreach IA » du panneau 360° : tout ce qu'il
 *  faut avoir sous les yeux avant de décrocher. Conditionnel champ par champ,
 *  donc invisible sur les fiches de seed et les imports CSV. */
export function CompanyOutreachPanel({ company }: { company: Company }) {
  const hours = company.opening_hours;
  const hoursEntries = hours ? Object.entries(hours).filter(([, v]) => !!v) : [];
  const negativeDate = formatDate(company.last_negative_review_date);

  const hasContent =
    !!company.recommended_angle ||
    !!company.call_script_hook ||
    !!company.ai_icebreaker ||
    !!company.last_negative_review_text ||
    hoursEntries.length > 0;

  if (!hasContent) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Préparation d&apos;appel &amp; Outreach IA</h3>

      <div className="space-y-2">
        {company.recommended_angle && (
          <div className="rounded-lg border bg-surface p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Compass className="h-3.5 w-3.5 text-brand" />
              Angle recommandé
            </p>
            <p className="text-sm">{company.recommended_angle}</p>
          </div>
        )}

        {company.call_script_hook && (
          <div className="rounded-lg border border-brand/30 bg-brand-soft p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-brand">
              <PhoneCall className="h-3.5 w-3.5" />
              Accroche téléphonique
            </p>
            <p className="text-sm">
              &laquo;&nbsp;{company.call_script_hook}&nbsp;&raquo;
            </p>
          </div>
        )}

        {company.ai_icebreaker && (
          <p className="flex items-start gap-1.5 rounded-md border border-accent/30 bg-accent-soft p-2 text-xs">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
            <span>{company.ai_icebreaker}</span>
          </p>
        )}

        {company.last_negative_review_text && (
          <div className="rounded-md bg-tier-d/10 p-2">
            <p className="flex items-start gap-1 text-xs italic text-muted-foreground">
              <MessageSquareWarning className="mt-0.5 h-3 w-3 shrink-0 text-tier-d" />
              <span>
                &laquo;&nbsp;{company.last_negative_review_text}&nbsp;&raquo;
              </span>
            </p>
            {negativeDate && (
              <p className="mt-1 pl-4 text-[11px] text-muted-foreground">
                Dernier avis négatif — {negativeDate}
              </p>
            )}
          </div>
        )}

        {hoursEntries.length > 0 && (
          <details className="rounded-lg border bg-surface p-3">
            <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand">
              <Clock className="h-3.5 w-3.5" />
              Horaires d&apos;ouverture
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {hoursEntries.map(([day, range]) => (
                <li key={day} className="flex items-center justify-between gap-2">
                  <span className="capitalize text-muted-foreground">{day}</span>
                  <span className="tabular-nums">{range}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
