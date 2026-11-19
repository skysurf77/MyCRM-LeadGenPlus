import { createClient } from "@/lib/supabase/server";
import { CompaniesView } from "@/components/companies/CompaniesView";
import type { Company, ScrapeBatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const [{ data: companies, error }, { data: batches }] = await Promise.all([
    supabase
      .from("companies")
      .select("*, scrape_batches(name)")
      .order("lead_score", { ascending: false })
      .limit(2000),
    supabase.from("scrape_batches").select("*").order("imported_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur de chargement des entreprises : {error.message}
        </div>
      </div>
    );
  }

  return (
    <CompaniesView
      initialCompanies={(companies ?? []) as Company[]}
      batches={(batches ?? []) as ScrapeBatch[]}
    />
  );
}
