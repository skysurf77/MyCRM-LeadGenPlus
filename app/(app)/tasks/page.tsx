import { createClient } from "@/lib/supabase/server";
import { TasksView } from "@/components/tasks/TasksView";
import type {
  Company,
  Profile,
  ScrapeBatch,
  TaskWithRelations,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: tasks, error }, { data: companies }, { data: profiles }, { data: batches }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*, companies(*), contacts(*)")
        .order("due_date", { ascending: true })
        .limit(5000),
      supabase.from("companies").select("*").order("name").limit(2000),
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("scrape_batches")
        .select("*")
        .order("imported_at", { ascending: false }),
    ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur de chargement des tâches : {error.message}
        </div>
      </div>
    );
  }

  return (
    <TasksView
      initialTasks={(tasks ?? []) as TaskWithRelations[]}
      companies={(companies ?? []) as Company[]}
      profiles={(profiles ?? []) as Profile[]}
      batches={(batches ?? []) as ScrapeBatch[]}
    />
  );
}
