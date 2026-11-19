"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  MapPin,
  Euro,
  CalendarDays,
  User,
  Trash2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/TierBadge";
import { formatEuros } from "@/lib/utils";
import {
  contactName,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  type Contact,
  type DealStage,
  type DealWithRelations,
} from "@/lib/types";

export function DealDrawer({
  deal,
  onClose,
  onUpdate,
  onDelete,
}: {
  deal: DealWithRelations | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<DealWithRelations>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<DealStage>("to_contact");
  const [mrr, setMrr] = useState("");
  const [contactId, setContactId] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setTitle(deal.title);
    setStage(deal.stage);
    setMrr(deal.mrr !== null ? String(deal.mrr) : "");
    setContactId(deal.primary_contact_id ?? "");
    setCloseDate(deal.expected_close_date ?? "");
    setLostReason(deal.lost_reason ?? "");

    let cancelled = false;
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", deal.company_id)
      .order("is_decision_maker", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setContacts(data as Contact[]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

  if (!deal) return null;

  const co = deal.companies;
  const mrrNumber = mrr.trim() === "" ? null : Number(mrr.replace(",", "."));
  const mrrValid = mrrNumber === null || (!Number.isNaN(mrrNumber) && mrrNumber >= 0);

  const dirty =
    title !== deal.title ||
    stage !== deal.stage ||
    mrrNumber !== deal.mrr ||
    (contactId || null) !== deal.primary_contact_id ||
    (closeDate || null) !== deal.expected_close_date ||
    (lostReason || null) !== deal.lost_reason;

  async function save() {
    if (!deal || !mrrValid) return;
    setSaving(true);
    try {
      const chosen = contacts.find((c) => c.id === contactId) ?? null;
      await onUpdate(deal.id, {
        title: title.trim() || deal.title,
        stage,
        mrr: mrrNumber,
        primary_contact_id: contactId || null,
        expected_close_date: closeDate || null,
        lost_reason: lostReason.trim() || null,
        contacts: chosen,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deal) return;
    if (!window.confirm("Retirer définitivement cette opportunité du pipeline ?")) return;
    setSaving(true);
    try {
      await onDelete(deal.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const selectedContact = contacts.find((c) => c.id === contactId) ?? null;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-foreground/20" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md animate-slide-in flex-col border-l bg-background shadow-drawer focus:outline-none">
          <div className="flex items-start justify-between border-b p-5">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                {co && <TierBadge tier={co.lead_tier} score={co.lead_score} />}
                <span className="text-xs text-muted-foreground">{co?.category}</span>
              </div>
              <Dialog.Title className="truncate text-lg font-semibold">
                {co?.name ?? deal.title}
              </Dialog.Title>
              {co?.city && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {co.postal_code} {co.city}
                </div>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Field label="Intitulé de l'opportunité">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Étape">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DEAL_STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {DEAL_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Abonnement mensuel" icon={<Euro className="h-3.5 w-3.5" />}>
                <input
                  value={mrr}
                  onChange={(e) => setMrr(e.target.value)}
                  inputMode="decimal"
                  placeholder="149"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {!mrrValid && (
                  <span className="mt-1 block text-xs text-tier-d">
                    Montant invalide.
                  </span>
                )}
              </Field>
              <Field
                label="Clôture estimée"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
              >
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            </div>

            <Field label="Contact rattaché" icon={<User className="h-3.5 w-3.5" />}>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Aucun —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactName(c)}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Aucun contact pour cette entreprise. Ajoutez-en un depuis sa fiche.
                </span>
              )}
            </Field>

            {selectedContact?.ai_icebreaker && (
              <div className="rounded-lg border border-accent/30 bg-accent-soft p-3">
                <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Accroche personnalisée
                </div>
                <p className="text-sm">{selectedContact.ai_icebreaker}</p>
              </div>
            )}

            {stage === "closed_lost" && (
              <Field label="Raison de la perte">
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={3}
                  placeholder="Budget, timing, concurrent…"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            )}

            {co?.gbp_url && (
              <a href={co.gbp_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" /> Fiche Google
                </Button>
              </a>
            )}

            <p className="text-xs text-muted-foreground">
              Valeur actuelle :{" "}
              <strong className="text-foreground">
                {deal.mrr !== null ? `${formatEuros(deal.mrr)} / mois` : "non estimée"}
              </strong>
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            <Button variant="ghost" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4 text-tier-d" />
            </Button>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost">Fermer</Button>
              </Dialog.Close>
              <Button onClick={save} disabled={!dirty || !mrrValid || saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
