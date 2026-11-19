import { createClient } from "@/lib/supabase/server";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import type {
  Company,
  ContactWithCompany,
  DealWithRelations,
  ScrapeBatch,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: companies, error }, { data: deals }, { data: contacts }, { data: batches }] =
    await Promise.all([
      supabase.from("companies").select("*").limit(5000),
      supabase.from("deals").select("*, companies(*), contacts(*)").limit(5000),
      supabase.from("contacts").select("*, companies(*)").limit(5000),
      supabase
        .from("scrape_batches")
        .select("*")
        .order("imported_at", { ascending: false }),
    ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur de chargement des statistiques : {error.message}
        </div>
      </div>
    );
  }

  return (
    <AnalyticsView
      companies={(companies ?? []) as Company[]}
      deals={(deals ?? []) as DealWithRelations[]}
      contacts={(contacts ?? []) as ContactWithCompany[]}
      batches={(batches ?? []) as ScrapeBatch[]}
    />
  );
}
