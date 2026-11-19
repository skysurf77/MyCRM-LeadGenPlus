"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Star,
  MessageSquare,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  KanbanSquare,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/TierBadge";
import { ContactDrawer } from "@/components/contacts/ContactDrawer";
import { CompanyContactsPanel } from "@/components/companies/CompanyContactsPanel";
import { CompanyTasksPanel } from "@/components/companies/CompanyTasksPanel";
import { CompanyAuditPanel } from "@/components/companies/CompanyAuditPanel";
import { CompanyOutreachPanel } from "@/components/companies/CompanyOutreachPanel";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { addDaysISO } from "@/lib/tasks";
import { computeScore } from "@/lib/scoring";
import { formatNumber, formatRating } from "@/lib/utils";
import {
  DEAL_STAGE_LABELS,
  DEFAULT_MRR,
  LIFECYCLE_LABELS,
  type Company,
  type Contact,
  type Deal,
  type LifecycleStatus,
  type Profile,
  type Task,
} from "@/lib/types";

const LIFECYCLE_OPTIONS = Object.keys(LIFECYCLE_LABELS) as LifecycleStatus[];

const BREAKDOWN_LABELS: Record<string, string> = {
  rating: "Note Google",
  reviews: "Nombre d'avis",
  web_presence: "Présence web",
  category: "Catégorie",
};

export function CompanyDrawer({
  company,
  onClose,
  onUpdate,
}: {
  company: Company | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Company>) => Promise<void>;
}) {
  const open = company !== null;
  const supabase = createClient();
  const [lifecycle, setLifecycle] = useState<LifecycleStatus>("nouveau");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Vue 360° : contacts et opportunité de l'entreprise.
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);
  const [dealBusy, setDealBusy] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Tâches & rappels liés à l'entreprise.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (company) {
      setLifecycle(company.lifecycle_status);
      setNotes(company.notes ?? "");
      setWebsite(company.website ?? "");
      setPhone(company.phone ?? "");
    }
  }, [company]);

  // Chargement des données liées à l'ouverture du panneau.
  useEffect(() => {
    if (!company) {
      setContacts([]);
      setOpenDeal(null);
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoadingContacts(true);
    setLoadingTasks(true);
    setDealError(null);

    Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("company_id", company.id)
        .order("is_decision_maker", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("deals")
        .select("*")
        .eq("company_id", company.id)
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .from("tasks")
        .select("*")
        .eq("company_id", company.id)
        .order("due_date", { ascending: true }),
      supabase.from("profiles").select("id, full_name, email"),
    ]).then(([contactsRes, dealsRes, tasksRes, profilesRes]) => {
      if (cancelled) return;
      setContacts((contactsRes.data ?? []) as Contact[]);
      setOpenDeal(((dealsRes.data ?? [])[0] as Deal | undefined) ?? null);
      setTasks((tasksRes.data ?? []) as Task[]);
      setProfiles(
        ((profilesRes.data ?? []) as Profile[]).map((pr) => ({
          id: pr.id,
          label: pr.full_name || pr.email || "Utilisateur",
        }))
      );
      setLoadingContacts(false);
      setLoadingTasks(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  async function sendToPipeline() {
    if (!company || openDeal) return;
    setDealBusy(true);
    setDealError(null);
    const decisionMaker = contacts.find((c) => c.is_decision_maker) ?? contacts[0] ?? null;
    try {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          company_id: company.id,
          title: `Abonnement avis — ${company.name}`,
          stage: "to_contact",
          mrr: DEFAULT_MRR,
          primary_contact_id: decisionMaker?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      setOpenDeal(data as Deal);
    } catch {
      setDealError(
        "Impossible de créer l'opportunité. Elle existe peut-être déjà dans le pipeline."
      );
    } finally {
      setDealBusy(false);
    }
  }

  /** Crée un rappel en un clic, sans ouvrir de formulaire. */
  async function quickReminder(days: number) {
    if (!company) return;
    setQuickBusy(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: `Rappeler ${company.name}`,
          type: "follow_up",
          priority: "normale",
          due_date: addDaysISO(days),
          company_id: company.id,
          contact_id:
            (contacts.find((c) => c.is_decision_maker) ?? contacts[0])?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      setTasks((prev) => [...prev, data as Task]);
    } catch {
      /* L'échec reste silencieux : la tâche n'apparaît simplement pas. */
    } finally {
      setQuickBusy(false);
    }
  }

  async function toggleTask(t: Task) {
    const next = t.status === "done" ? "todo" : "done";
    const previous = tasks;
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: next } : x))
    );
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    if (error) setTasks(previous);
  }

  function handleTaskSaved(saved: Task) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
    });
  }

  function handleContactSaved(saved: Contact) {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
  }

  if (!company) return null;

  const dirty =
    lifecycle !== company.lifecycle_status ||
    notes !== (company.notes ?? "") ||
    website !== (company.website ?? "") ||
    phone !== (company.phone ?? "");

  async function save() {
    if (!company) return;
    setSaving(true);
    // Re-score si des champs qui influencent le score ont changé.
    const rescored = computeScore({
      rating: company.rating,
      reviews_count: company.reviews_count,
      website,
      phone,
      category: company.category,
    });
    try {
      await onUpdate(company.id, {
        lifecycle_status: lifecycle,
        notes,
        website: website || null,
        phone: phone || null,
        lead_score: rescored.lead_score,
        lead_tier: rescored.lead_tier,
        score_breakdown: rescored.score_breakdown,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const breakdown = company.score_breakdown;

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-foreground/20" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md animate-slide-in flex-col border-l bg-background shadow-drawer focus:outline-none">
          {/* En-tête */}
          <div className="flex items-start justify-between border-b p-5">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <TierBadge tier={company.lead_tier} score={company.lead_score} />
                <span className="text-xs text-muted-foreground">{company.category}</span>
              </div>
              <Dialog.Title className="truncate text-lg font-semibold">
                {company.name}
              </Dialog.Title>
              {company.city && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.address ? `${company.address}, ` : ""}
                  {company.postal_code} {company.city}
                </div>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* Indicateurs clés */}
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Star className="h-4 w-4 text-tier-b" />} label="Note" value={formatRating(company.rating)} />
              <Stat icon={<MessageSquare className="h-4 w-4 text-brand" />} label="Avis" value={formatNumber(company.reviews_count)} />
              <Stat icon={<span className="text-xs font-bold text-accent">★</span>} label="Score" value={String(company.lead_score)} />
            </div>

            {/* Liens */}
            <div className="flex flex-wrap gap-2">
              {company.gbp_url && (
                <a href={company.gbp_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Fiche Google
                  </Button>
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Globe className="h-3.5 w-3.5" /> Site web
                  </Button>
                </a>
              )}
            </div>

            {/* Détail du score */}
            {(breakdown || company.score_breakdown_text) && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Détail du score</h3>
                {company.score_breakdown_text && (
                  <p className="mb-3 rounded-md border bg-surface p-2 text-xs text-muted-foreground">
                    {company.score_breakdown_text}
                  </p>
                )}
                <div className="space-y-2">
                  {breakdown &&
                    (["rating", "reviews", "web_presence", "category"] as const).map((k) => {
                    const comp = (breakdown as any)[k];
                    if (!comp) return null;
                    const pct = comp.weight ? (comp.points / comp.weight) * 100 : 0;
                    return (
                      <div key={k}>
                        <div className="mb-0.5 flex justify-between text-xs">
                          <span className="text-muted-foreground">{BREAKDOWN_LABELS[k]}</span>
                          <span className="tabular-nums">
                            {comp.points} / {comp.weight}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {breakdown?.disqualified && (
                    <p className="pt-1 text-xs text-tier-d">
                      ⚠ Disqualifié : aucune présence web (site/téléphone).
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Audit Google & benchmark local (données LeadGenEngine) */}
            <CompanyAuditPanel company={company} />

            {/* Préparation d'appel & outreach IA (données LeadGenEngine) */}
            <CompanyOutreachPanel company={company} />

            {/* Vue 360° — contacts rattachés */}
            <CompanyContactsPanel
              contacts={contacts}
              loading={loadingContacts}
              onAdd={() => {
                setEditingContact(null);
                setContactDrawerOpen(true);
              }}
              onEdit={(c) => {
                setEditingContact(c);
                setContactDrawerOpen(true);
              }}
            />

            {/* Vue 360° — opportunité commerciale */}
            <section>
              <h3 className="mb-2 text-sm font-semibold">Pipeline</h3>
              {openDeal ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-surface p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Dans le pipeline
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Étape : {DEAL_STAGE_LABELS[openDeal.stage]}
                    </p>
                  </div>
                  <Link href="/pipeline">
                    <Button variant="outline" size="sm">
                      <KanbanSquare className="h-3.5 w-3.5" /> Ouvrir
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Button
                    variant="brand"
                    className="w-full"
                    onClick={sendToPipeline}
                    disabled={dealBusy}
                  >
                    <KanbanSquare className="h-4 w-4" />
                    {dealBusy ? "Création…" : "Envoyer dans le Pipeline"}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Crée une opportunité « Nouveau lead » à {DEFAULT_MRR} €/mois,
                    ajustable depuis la carte.
                  </p>
                </>
              )}
              {dealError && (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {dealError}
                </p>
              )}
            </section>

            {/* Vue 360° — tâches & rappels */}
            <CompanyTasksPanel
              tasks={tasks}
              loading={loadingTasks}
              quickBusy={quickBusy}
              onQuickReminder={quickReminder}
              onNew={() => {
                setEditingTask(null);
                setTaskDrawerOpen(true);
              }}
              onToggle={toggleTask}
              onEdit={(t) => {
                setEditingTask(t);
                setTaskDrawerOpen(true);
              }}
            />

            {/* Édition */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Qualification</h3>

              <Field label="Statut">
                <select
                  value={lifecycle}
                  onChange={(e) => setLifecycle(e.target.value as LifecycleStatus)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {LIFECYCLE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {LIFECYCLE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-3">
                <Field label="Site web" icon={<Globe className="h-3.5 w-3.5" />}>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://…"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
                <Field label="Téléphone" icon={<Phone className="h-3.5 w-3.5" />}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01 23 45 67 89"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Contexte, historique d'échanges…"
                  className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
            </section>
          </div>

          {/* Pied : sauvegarde */}
          <div className="flex items-center justify-end gap-2 border-t p-4">
            <Dialog.Close asChild>
              <Button variant="ghost">Fermer</Button>
            </Dialog.Close>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    {/* Tiroir imbriqué : création / édition d'un contact sans quitter la fiche. */}
    <ContactDrawer
      open={contactDrawerOpen}
      onOpenChange={setContactDrawerOpen}
      contact={editingContact}
      companyId={company.id}
      companyName={company.name}
      onSaved={handleContactSaved}
      onDeleted={(id) => setContacts((prev) => prev.filter((c) => c.id !== id))}
    />

    {/* Tiroir imbriqué : planifier une relance sans quitter la fiche. */}
    <TaskDrawer
      open={taskDrawerOpen}
      onOpenChange={setTaskDrawerOpen}
      task={editingTask}
      defaultCompanyId={company.id}
      profiles={profiles}
      onSaved={handleTaskSaved}
      onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
    />
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
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
