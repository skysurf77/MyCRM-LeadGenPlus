"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Building2,
  User,
  CalendarDays,
  Flag,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { addDaysISO } from "@/lib/tasks";
import {
  contactName,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
  type Contact,
  type Task,
  type TaskPriority,
  type TaskType,
} from "@/lib/types";

interface FormState {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string;
  company_id: string;
  contact_id: string;
  assigned_to: string;
}

function emptyForm(companyId: string | null): FormState {
  return {
    title: "",
    type: "call",
    priority: "normale",
    due_date: addDaysISO(1),
    company_id: companyId ?? "",
    contact_id: "",
    assigned_to: "",
  };
}

/** Tiroir de création / édition d'une tâche.
 *  Réutilisé par l'onglet Tâches et par le panneau 360° d'une entreprise. */
export function TaskDrawer({
  open,
  onOpenChange,
  task,
  defaultCompanyId,
  companyOptions,
  profiles,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = création. */
  task: Task | null;
  defaultCompanyId?: string | null;
  /** Si fourni, un sélecteur d'entreprise s'affiche (onglet Tâches). */
  companyOptions?: { id: string; name: string; city: string | null }[];
  profiles: { id: string; label: string }[];
  onSaved: (t: Task) => void;
  onDeleted?: (id: string) => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(emptyForm(null));
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      task
        ? {
            title: task.title,
            type: task.type,
            priority: task.priority,
            due_date: task.due_date ?? "",
            company_id: task.company_id ?? "",
            contact_id: task.contact_id ?? "",
            assigned_to: task.assigned_to ?? "",
          }
        : emptyForm(defaultCompanyId ?? null)
    );
  }, [open, task, defaultCompanyId]);

  // Les contacts proposés suivent l'entreprise choisie.
  useEffect(() => {
    if (!open || !form.company_id) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", form.company_id)
      .order("is_decision_maker", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setContacts(data as Contact[]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.company_id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSave = form.title.trim() !== "";

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      due_date: form.due_date || null,
      company_id: form.company_id || null,
      contact_id: form.contact_id || null,
      assigned_to: form.assigned_to || null,
    };

    try {
      const query = task
        ? supabase.from("tasks").update(payload).eq("id", task.id)
        : supabase.from("tasks").insert(payload);
      const { data, error: dbError } = await query.select("*").single();
      if (dbError) throw dbError;
      onSaved(data as Task);
      onOpenChange(false);
    } catch {
      setError("Enregistrement impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!task) return;
    if (!window.confirm("Supprimer définitivement cette tâche ?")) return;
    setSaving(true);
    try {
      const { error: dbError } = await supabase.from("tasks").delete().eq("id", task.id);
      if (dbError) throw dbError;
      onDeleted?.(task.id);
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
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
              <CheckSquare className="h-4 w-4 text-brand" />
              {task ? "Modifier la tâche" : "Nouvelle tâche"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Field label="Intitulé">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Rappeler le gérant pour l'audit"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type d'action">
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as TaskType)}
                  className={inputCls}
                >
                  {TASK_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {TASK_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priorité" icon={<Flag className="h-3.5 w-3.5" />}>
                <select
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value as TaskPriority)}
                  className={inputCls}
                >
                  {TASK_PRIORITY_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Échéance" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className={inputCls}
              />
              <span className="mt-1 flex flex-wrap gap-1">
                {[
                  { label: "Aujourd'hui", d: 0 },
                  { label: "Demain", d: 1 },
                  { label: "Dans 3 jours", d: 3 },
                  { label: "Dans 1 semaine", d: 7 },
                ].map((q) => (
                  <button
                    key={q.d}
                    type="button"
                    onClick={() => set("due_date", addDaysISO(q.d))}
                    className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                  >
                    {q.label}
                  </button>
                ))}
              </span>
            </Field>

            {companyOptions && (
              <Field label="Entreprise" icon={<Building2 className="h-3.5 w-3.5" />}>
                <select
                  value={form.company_id}
                  onChange={(e) => {
                    set("company_id", e.target.value);
                    set("contact_id", "");
                  }}
                  className={inputCls}
                >
                  <option value="">— Aucune —</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` — ${c.city}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Contact" icon={<User className="h-3.5 w-3.5" />}>
              <select
                value={form.contact_id}
                onChange={(e) => set("contact_id", e.target.value)}
                disabled={!form.company_id}
                className={inputCls}
              >
                <option value="">— Aucun —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactName(c)}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </select>
              {!form.company_id && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Choisissez d&apos;abord une entreprise.
                </span>
              )}
            </Field>

            <Field label="Assignée à">
              <select
                value={form.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value)}
                className={inputCls}
              >
                <option value="">— Non assignée —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            {task && onDeleted ? (
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
                {saving ? "Enregistrement…" : task ? "Enregistrer" : "Créer la tâche"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

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
