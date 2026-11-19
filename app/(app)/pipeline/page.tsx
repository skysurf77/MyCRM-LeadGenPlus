import { createClient } from "@/lib/supabase/server";
import { PipelineView } from "@/components/pipeline/PipelineView";
import type { DealWithRelations, ScrapeBatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [{ data: deals, error }, { data: batches }] = await Promise.all([
    // `contacts(*)` suit la clé étrangère deals.primary_contact_id (unique).
    supabase.from("deals").select("*, companies(*), contacts(*)").limit(2000),
    supabase
      .from("scrape_batches")
      .select("*")
      .order("imported_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur de chargement du pipeline : {error.message}
        </div>
      </div>
    );
  }

  return (
    <PipelineView
      initialDeals={(deals ?? []) as DealWithRelations[]}
      batches={(batches ?? []) as ScrapeBatch[]}
    />
  );
}
