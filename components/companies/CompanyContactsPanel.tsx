"use client";

import {
  Mail,
  Phone,
  PhoneCall,
  Linkedin,
  Sparkles,
  MessageSquareWarning,
  Plus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnrichmentBadge } from "@/components/EnrichmentBadge";
import { EmailVerificationBadge } from "@/components/EmailVerificationBadge";
import { contactName, type Contact } from "@/lib/types";

/** Bloc « contacts » du panneau 360° d'une entreprise. */
export function CompanyContactsPanel({
  contacts,
  loading,
  onAdd,
  onEdit,
}: {
  contacts: Contact[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (c: Contact) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Contacts{!loading && contacts.length > 0 && ` (${contacts.length})`}
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Aucun décideur identifié. Ajoutez-le manuellement ou laissez
          l&apos;enrichissement automatique le remplir.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {contactName(c)}
                    </span>
                    {c.is_decision_maker && (
                      <span className="rounded bg-brand-soft px-1 text-[10px] font-semibold text-brand">
                        DÉCIDEUR
                      </span>
                    )}
                  </div>
                  {c.title && (
                    <p className="truncate text-xs text-muted-foreground">{c.title}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  title="Modifier"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-brand"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <EnrichmentBadge status={c.enrichment_status} />
                {c.email_verification_status && (
                  <EmailVerificationBadge status={c.email_verification_status} />
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-brand"
                  >
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{c.email}</span>
                  </a>
                )}
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-brand"
                  >
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </a>
                )}
                {c.direct_phone && (
                  <a
                    href={`tel:${c.direct_phone.replace(/\s/g, "")}`}
                    title="Ligne directe"
                    className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-brand"
                  >
                    <PhoneCall className="h-3 w-3" />
                    {c.direct_phone}
                  </a>
                )}
                {c.linkedin_url && (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-brand"
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </a>
                )}
              </div>

              {c.last_negative_review && (
                <p className="mt-2 flex items-start gap-1 rounded-md bg-tier-d/10 p-2 text-xs italic text-muted-foreground">
                  <MessageSquareWarning className="mt-0.5 h-3 w-3 shrink-0 text-tier-d" />
                  <span className="line-clamp-3">
                    &laquo;&nbsp;{c.last_negative_review}&nbsp;&raquo;
                  </span>
                </p>
              )}

              {c.ai_icebreaker && (
                <p className="mt-2 flex items-start gap-1 rounded-md border border-accent/30 bg-accent-soft p-2 text-xs">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  <span>{c.ai_icebreaker}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
