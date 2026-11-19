"use client";

import { useMemo, useState } from "react";
import { Plus, CheckSquare, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFilters, useFilterUrlSync } from "@/store/useFilters";
import { matchesTask } from "@/lib/filters";
import { groupByUrgency, URGENCY_LABELS, URGENCY_ORDER, todayISO } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import type { FacetOption } from "@/components/FacetFilter";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { CompanyDrawer } from "@/components/companies/CompanyDrawer";
import { cn } from "@/lib/utils";
import type {
  Company,
  Profile,
  ScrapeBatch,
  Task,
  TaskWithRelations,
} from "@/lib/types";

const TASK_SELECT = "*, companies(*), contacts(*)";

export function TasksView({
  initialTasks,
  companies,
  profiles,
  batches,
}: {
  initialTasks: TaskWithRelations[];
  companies: Company[];
  profiles: Profile[];
  batches: ScrapeBatch[];
}) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [editing, setEditing] = useState<TaskWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contextCompany, setContextCompany] = useState<Company | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true });
  const supabase = createClient();

  const filters = useFilters();
  useFilterUrlSync();

  const today = todayISO();

  const companyOptions = useMemo(
    () =>
      companies
        .map((c) => ({ id: c.id, name: c.name, city: c.city }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [companies]
  );
  const profileOptions = useMemo(
    () =>
      profiles.map((p) => ({ id: p.id, label: p.full_name || p.email || "Utilisateur" })),
    [profiles]
  );

  const cityOptions = useMemo(
    () => facet(tasks, (t) => t.companies?.city ?? null),
    [tasks]
  );
  const categoryOptions = useMemo(
    () => facet(tasks, (t) => t.companies?.category ?? null),
    [tasks]
  );
  const batchOptions: FacetOption[] = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.name })),
    [batches]
  );

  const snapshot = filters.snapshot();
  const filtered = useMemo(
    () => tasks.filter((t) => matchesTask(t, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, JSON.stringify(snapshot)]
  );

  const groups = useMemo(() => groupByUrgency(filtered, today), [filtered, today]);
  const openCount = groups.overdue.length + groups.today.length + groups.upcoming.length;

  async function refetch() {
    const { data } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("due_date", { ascending: true })
      .limit(5000);
    if (data) setTasks(data as TaskWithRelations[]);
  }

  async function toggleTask(t: TaskWithRelations) {
    const next = t.status === "done" ? "todo" : "done";
    const previous = tasks;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? {
              ...x,
              status: next,
              completed_at: next === "done" ? new Date().toISOString() : null,
            }
          : x
      )
    );
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    if (error) {
      setTasks(previous);
      await refetch();
    }
  }

  function handleSaved(saved: Task) {
    setTasks((prev) => {
      const existing = prev.find((t) => t.id === saved.id);
      const company = companies.find((c) => c.id === saved.company_id) ?? null;
      if (existing) {
        return prev.map((t) =>
          t.id === saved.id
            ? {
                ...saved,
                companies: company,
                // Le contact lié peut avoir changé : on recharge en tâche de fond.
                contacts: saved.contact_id === t.contact_id ? t.contacts : null,
              }
            : t
        );
      }
      return [...prev, { ...saved, companies: company, contacts: null }];
    });
    void refetch();
  }

  async function updateCompany(id: string, patch: Partial<Company>) {
    setContextCompany((c) => (c && c.id === id ? { ...c, ...patch } : c));
    setTasks((prev) =>
      prev.map((t) =>
        t.companies?.id === id ? { ...t, companies: { ...t.companies, ...patch } } : t
      )
    );
    const { scrape_batches: _j, ...dbPatch } = patch as Record<string, unknown>;
    await supabase.from("companies").update(dbPatch).eq("id", id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 pt-4">
        <div className="pb-3">
          <h2 className="text-lg font-semibold">
            {openCount} tâche{openCount > 1 ? "s" : ""} en cours
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={cn(groups.overdue.length > 0 && "font-semibold text-chart-bad")}>
              {groups.overdue.length} en retard
            </span>
            <span aria-hidden>·</span>
            <span className={cn(groups.today.length > 0 && "font-semibold text-accent")}>
              {groups.today.length} aujourd&apos;hui
            </span>
            <span aria-hidden>·</span>
            <span>{groups.upcoming.length} à venir</span>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </Button>
      </div>

      <FilterBar
        cities={cityOptions}
        categories={categoryOptions}
        batches={batchOptions}
        searchPlaceholder="Rechercher une tâche, une entreprise…"
      />

      {filtered.length === 0 ? (
        <EmptyState
          hasData={tasks.length > 0}
          onNew={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {URGENCY_ORDER.map((bucket) => {
            const items = groups[bucket];
            if (items.length === 0) return null;
            const isCollapsed = collapsed[bucket] ?? false;
            return (
              <section key={bucket}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [bucket]: !isCollapsed }))
                  }
                  className="sticky top-0 z-10 flex w-full items-center gap-2 border-b bg-surface px-6 py-2 text-left"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      bucket === "overdue" ? "text-chart-bad" : "text-muted-foreground"
                    )}
                  >
                    {URGENCY_LABELS[bucket]}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </button>

                {!isCollapsed &&
                  items.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      bucket={bucket}
                      onToggle={toggleTask}
                      onEdit={(t) => {
                        setEditing(t);
                        setDrawerOpen(true);
                      }}
                      onOpenCompany={(id) =>
                        setContextCompany(companies.find((c) => c.id === id) ?? null)
                      }
                    />
                  ))}
              </section>
            );
          })}
        </div>
      )}

      <TaskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        task={editing}
        companyOptions={companyOptions}
        profiles={profileOptions}
        onSaved={handleSaved}
        onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Contexte d'appel : la fiche entreprise sans quitter la liste. */}
      <CompanyDrawer
        company={contextCompany}
        onClose={() => setContextCompany(null)}
        onUpdate={updateCompany}
      />
    </div>
  );
}

function facet(
  tasks: TaskWithRelations[],
  pick: (t: TaskWithRelations) => string | null
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const v = pick(t);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([value, count]) => ({ value, label: value, count }));
}

function EmptyState({ hasData, onNew }: { hasData: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CheckSquare className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium">
          {hasData ? "Aucune tâche ne correspond aux filtres" : "Aucune tâche"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasData
            ? "Ajustez ou effacez les filtres pour voir plus de résultats."
            : "Planifiez votre première relance depuis une fiche entreprise ou ici."}
        </p>
      </div>
      {!hasData && (
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </Button>
      )}
    </div>
  );
}
