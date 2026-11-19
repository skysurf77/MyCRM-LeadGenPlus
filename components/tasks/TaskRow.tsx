"use client";

import { Phone, Mail, Linkedin, RotateCcw, Presentation, Circle, Flag } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { cn } from "@/lib/utils";
import { formatDueDate, relativeDueLabel, type UrgencyBucket } from "@/lib/tasks";
import {
  contactName,
  TASK_TYPE_LABELS,
  type TaskType,
  type TaskWithRelations,
} from "@/lib/types";

const TYPE_ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  linkedin: Linkedin,
  follow_up: RotateCcw,
  demo: Presentation,
  other: Circle,
};

export function TaskRow({
  task,
  bucket,
  onToggle,
  onEdit,
  onOpenCompany,
}: {
  task: TaskWithRelations;
  bucket: UrgencyBucket;
  onToggle: (t: TaskWithRelations) => void;
  onEdit: (t: TaskWithRelations) => void;
  onOpenCompany: (companyId: string) => void;
}) {
  const Icon = TYPE_ICONS[task.type] ?? Circle;
  const done = task.status === "done";
  const co = task.companies;

  return (
    <div
      onClick={() => onEdit(task)}
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b px-6 py-2.5 transition-colors hover:bg-brand-soft/40",
        done && "opacity-60"
      )}
    >
      {/* Case à cocher rapide */}
      <input
        type="checkbox"
        checked={done}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle(task)}
        aria-label={done ? "Rouvrir la tâche" : "Marquer comme terminée"}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-[hsl(var(--brand))]"
      />

      {/* Priorité haute : un fanion, jamais la couleur seule */}
      <span className="w-4 shrink-0">
        {task.priority === "haute" && !done && (
          <Flag className="h-3.5 w-3.5 text-chart-bad" aria-label="Priorité haute" />
        )}
      </span>

      {/* Intitulé + contexte (type · entreprise · contact) */}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", done && "line-through")}>
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="shrink-0">{TASK_TYPE_LABELS[task.type]}</span>

          {/* L'entreprise est toujours nommée, et ouvre sa fiche sans
              déclencher le clic de la ligne (qui ouvrirait la tâche). */}
          {co && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCompany(co.id);
                }}
                title={`Ouvrir la fiche de ${co.name}`}
                className="max-w-[14rem] truncate font-medium text-brand hover:underline"
              >
                {co.name}
              </button>
            </>
          )}

          {!co && (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0 italic">Rappel interne</span>
            </>
          )}

          {task.contacts && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{contactName(task.contacts)}</span>
            </>
          )}
        </div>
      </div>

      {/* Score : colonne alignée, scannable verticalement.
          Le nom de l'entreprise vit sur la ligne secondaire, pas ici. */}
      <div className="hidden w-20 shrink-0 justify-start md:flex">
        {co ? (
          <TierBadge tier={co.lead_tier} score={co.lead_score} />
        ) : (
          <span className="text-xs text-muted-foreground/40" aria-hidden>
            —
          </span>
        )}
      </div>

      {/* Échéance */}
      <div className="w-32 shrink-0 text-right">
        <div
          className={cn(
            "text-xs font-medium tabular-nums",
            bucket === "overdue" && "text-chart-bad",
            bucket === "today" && "text-accent",
            (bucket === "upcoming" || bucket === "done") && "text-muted-foreground"
          )}
        >
          {done ? formatDueDate(task.due_date) : relativeDueLabel(task.due_date)}
        </div>
        {!done && task.due_date && (
          <div className="text-[11px] tabular-nums text-muted-foreground">
            {formatDueDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  );
}
