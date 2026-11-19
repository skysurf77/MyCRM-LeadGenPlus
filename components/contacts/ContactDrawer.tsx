"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Mail,
  Phone,
  Linkedin,
  BadgeCheck,
  Sparkles,
  MessageSquareWarning,
  Trash2,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ENRICHMENT_LABELS,
  type Contact,
  type EnrichmentStatus,
} from "@/lib/types";

const ENRICHMENT_OPTIONS = Object.keys(ENRICHMENT_LABELS) as EnrichmentStatus[];

interface FormState {
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  is_decision_maker: boolean;
  enrichment_status: EnrichmentStatus;
  last_negative_review: string;
  ai_icebreaker: string;
}

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  title: "",
  email: "",
  phone: "",
  linkedin_url: "",
  is_decision_maker: true,
  enrichment_status: "a_enrichir",
  last_negative_review: "",
  ai_icebreaker: "",
};

function fromContact(c: Contact): FormState {
  return {
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    title: c.title ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    linkedin_url: c.linkedin_url ?? "",
    is_decision_maker: c.is_decision_maker,
    enrichment_status: c.enrichment_status,
    last_negative_review: c.last_negative_review ?? "",
    ai_icebreaker: c.ai_icebreaker ?? "",
  };
}

/** Tiroir de création / édition d'un contact.
 *  Réutilisé par l'onglet Contacts et par le panneau 360° d'une entreprise. */
export function ContactDrawer({
  open,
  onOpenChange,
  contact,
  companyId,
  companyName,
  companyOptions,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = création d'un nouveau contact. */
  contact: Contact | null;
  /** Entreprise de rattachement (obligatoire en création). */
  companyId: string | null;
  companyName?: string | null;
  /** Si fourni, un sélecteur d'entreprise s'affiche en création
   *  (onglet Contacts, où l'entreprise n'est pas encore connue). */
  companyOptions?: { id: string; name: string; city: string | null }[];
  onSaved: (c: Contact) => void;
  onDeleted?: (id: string) => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [companyChoice, setCompanyChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCompanyPicker = !contact && !!companyOptions?.length;
  const targetCompanyId = showCompanyPicker ? companyChoice || null : companyId;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(contact ? fromContact(contact) : EMPTY_FORM);
    setCompanyChoice(companyId ?? "");
  }, [open, contact, companyId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const nameFilled = form.first_name.trim() !== "" || form.last_name.trim() !== "";
  const emailValid = form.email.trim() === "" || /^\S+@\S+\.\S+$/.test(form.email.trim());
  const canSave =
    nameFilled && emailValid && (contact !== null || targetCompanyId !== null);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const payload = {
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      title: form.title.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      is_decision_maker: form.is_decision_maker,
      enrichment_status: form.enrichment_status,
      last_negative_review: form.last_negative_review.trim() || null,
      ai_icebreaker: form.ai_icebreaker.trim() || null,
    };

    try {
      const query = contact
        ? supabase.from("contacts").update(payload).eq("id", contact.id)
        : supabase
            .from("contacts")
            .insert({ ...payload, company_id: targetCompanyId });

      const { data, error: dbError } = await query.select("*").single();
      if (dbError) throw dbError;

      onSaved(data as Contact);
      onOpenChange(false);
    } catch {
      setError("Enregistrement impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!contact) return;
    if (!window.confirm(`Supprimer définitivement ce contact ?`)) return;
    setSaving(true);
    try {
      const { error: dbError } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);
      if (dbError) throw dbError;
      onDeleted?.(contact.id);
      onOpenChange(false);
    } catch {
      setError("Suppression impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-foreground/20" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md animate-slide-in flex-col border-l bg-background shadow-drawer focus:outline-none">
          <div className="flex items-start justify-between border-b p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">
                {contact ? "Modifier le contact" : "Nouveau contact"}
              </Dialog.Title>
              {companyName && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{companyName}</span>
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
            {showCompanyPicker && (
              <Field label="Entreprise" icon={<Building2 className="h-3.5 w-3.5" />}>
                <select
                  value={companyChoice}
                  onChange={(e) => setCompanyChoice(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— Choisir une entreprise —</option>
                  {companyOptions!.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` — ${c.city}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <TextInput
                  value={form.first_name}
                  onChange={(v) => set("first_name", v)}
                  placeholder="Marie"
                />
              </Field>
              <Field label="Nom">
                <TextInput
                  value={form.last_name}
                  onChange={(v) => set("last_name", v)}
                  placeholder="Durand"
                />
              </Field>
            </div>

            <Field label="Rôle / fonction" icon={<BadgeCheck className="h-3.5 w-3.5" />}>
              <TextInput
                value={form.title}
                onChange={(v) => set("title", v)}
                placeholder="Gérante, Propriétaire…"
              />
            </Field>

            <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
              <TextInput
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="marie@exemple.fr"
                type="email"
              />
              {!emailValid && (
                <span className="mt-1 block text-xs text-tier-d">
                  Format d&apos;email invalide.
                </span>
              )}
            </Field>

            <Field label="Téléphone direct" icon={<Phone className="h-3.5 w-3.5" />}>
              <TextInput
                value={form.phone}
                onChange={(v) => set("phone", v)}
                placeholder="06 12 34 56 78"
              />
            </Field>

            <Field label="Profil LinkedIn" icon={<Linkedin className="h-3.5 w-3.5" />}>
              <TextInput
                value={form.linkedin_url}
                onChange={(v) => set("linkedin_url", v)}
                placeholder="https://linkedin.com/in/…"
              />
            </Field>

            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Statut d'enrichissement">
                <select
                  value={form.enrichment_status}
                  onChange={(e) =>
                    set("enrichment_status", e.target.value as EnrichmentStatus)
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ENRICHMENT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ENRICHMENT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_decision_maker}
                  onChange={(e) => set("is_decision_maker", e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-[hsl(var(--brand))]"
                />
                Décideur
              </label>
            </div>

            <div className="space-y-4 rounded-lg border bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Matière première de la prospection
              </p>

              <Field
                label="Dernier avis négatif"
                icon={<MessageSquareWarning className="h-3.5 w-3.5" />}
              >
                <textarea
                  value={form.last_negative_review}
                  onChange={(e) => set("last_negative_review", e.target.value)}
                  rows={3}
                  placeholder="« Service lent et personnel peu aimable… »"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>

              <Field
                label="Accroche personnalisée (IA)"
                icon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
              >
                <textarea
                  value={form.ai_icebreaker}
                  onChange={(e) => set("ai_icebreaker", e.target.value)}
                  rows={3}
                  placeholder="J'ai vu que votre dernier avis mentionnait…"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            {contact && onDeleted ? (
              <Button variant="ghost" onClick={remove} disabled={saving}>
                <Trash2 className="h-4 w-4 text-tier-d" />
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost">Annuler</Button>
              </Dialog.Close>
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? "Enregistrement…" : contact ? "Enregistrer" : "Créer le contact"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
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
