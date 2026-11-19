// Regroupement des tâches par urgence — logique partagée par l'onglet Tâches,
// le panneau 360° d'une entreprise et les statistiques.

import type { TaskWithRelations } from "@/lib/types";

export type UrgencyBucket = "overdue" | "today" | "upcoming" | "done";

export const URGENCY_ORDER: UrgencyBucket[] = [
  "overdue",
  "today",
  "upcoming",
  "done",
];

export const URGENCY_LABELS: Record<UrgencyBucket, string> = {
  overdue: "En retard",
  today: "Aujourd'hui",
  upcoming: "À venir",
  done: "Terminées",
};

/** Date du jour au format `YYYY-MM-DD`, dans le fuseau local du navigateur.
 *  `due_date` est un `date` Postgres (sans heure) : on compare des chaînes
 *  pour éviter tout décalage de fuseau horaire. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function bucketOf(t: TaskWithRelations, today = todayISO()): UrgencyBucket {
  if (t.status === "done") return "done";
  if (!t.due_date) return "upcoming"; // sans échéance = pas urgent
  if (t.due_date < today) return "overdue";
  if (t.due_date === today) return "today";
  return "upcoming";
}

export function groupByUrgency(
  tasks: TaskWithRelations[],
  today = todayISO()
): Record<UrgencyBucket, TaskWithRelations[]> {
  const groups: Record<UrgencyBucket, TaskWithRelations[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    done: [],
  };
  for (const t of tasks) groups[bucketOf(t, today)].push(t);

  // Les plus urgentes d'abord ; les terminées, les plus récentes d'abord.
  const byDueAsc = (a: TaskWithRelations, b: TaskWithRelations) =>
    (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
  groups.overdue.sort(byDueAsc);
  groups.today.sort(byDueAsc);
  groups.upcoming.sort(byDueAsc);
  groups.done.sort((a, b) =>
    (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at)
  );
  return groups;
}

/** Libellé relatif court : « il y a 3 jours », « demain », « dans 5 jours ». */
export function relativeDueLabel(dueDate: string | null, today = todayISO()): string {
  if (!dueDate) return "Sans échéance";
  const days = daysBetween(today, dueDate);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days === -1) return "Hier";
  if (days < 0) return `Il y a ${Math.abs(days)} jours`;
  return `Dans ${days} jours`;
}

/** Nombre de jours calendaires entre deux dates `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Date au format `YYYY-MM-DD` décalée de N jours — pour « Rappeler dans 3 jours ». */
export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "—";
  const [y, m, d] = dueDate.split("-");
  return `${d}/${m}/${y}`;
}
