"use client";

import { Plus, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bucketOf, formatDueDate, relativeDueLabel } from "@/lib/tasks";
import { TASK_TYPE_LABELS, type Task } from "@/lib/types";

/** Bloc « Tâches & Rappels » du panneau 360° d'une entreprise. */
export function CompanyTasksPanel({
  tasks,
  loading,
  quickBusy,
  onQuickReminder,
  onNew,
  onToggle,
  onEdit,
}: {
  tasks: Task[];
  loading: boolean;
  quickBusy: boolean;
  onQuickReminder: (days: number) => void;
  onNew: () => void;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
}) {
  const open = tasks.filter((t) => t.status === "todo");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Tâches &amp; rappels{!loading && open.length > 0 && ` (${open.length})`}
        </h3>
        <Button variant="outline" size="sm" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle
        </Button>
      </div>

      {/* Rappels en un clic */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {[
          { label: "Rappeler demain", days: 1 },
          { label: "Dans 3 jours", days: 3 },
          { label: "Dans 1 semaine", days: 7 },
        ].map((q) => (
          <button
            key={q.days}
            type="button"
            disabled={quickBusy}
            onClick={() => onQuickReminder(q.days)}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand disabled:opacity-50"
          >
            <Clock className="h-3 w-3" />
            {q.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Aucune tâche planifiée pour cette entreprise.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {[...open, ...done].map((t) => {
            const bucket = bucketOf({ ...t, companies: null, contacts: null });
            const isDone = t.status === "done";
            return (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-surface p-2.5",
                  isDone && "opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => onToggle(t)}
                  aria-label={isDone ? "Rouvrir la tâche" : "Marquer comme terminée"}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-[hsl(var(--brand))]"
                />
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={cn(
                      "block truncate text-sm",
                      isDone && "line-through"
                    )}
                  >
                    {t.title}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {t.priority === "haute" && !isDone && (
                      <Flag className="h-3 w-3 text-chart-bad" aria-label="Priorité haute" />
                    )}
                    {TASK_TYPE_LABELS[t.type]}
                  </span>
                </button>
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    bucket === "overdue" && !isDone
                      ? "font-semibold text-chart-bad"
                      : bucket === "today" && !isDone
                        ? "font-semibold text-accent"
                        : "text-muted-foreground"
                  )}
                  title={formatDueDate(t.due_date)}
                >
                  {isDone ? formatDueDate(t.due_date) : relativeDueLabel(t.due_date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}