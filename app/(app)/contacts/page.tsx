import { createClient } from "@/lib/supabase/server";
import { ContactsView } from "@/components/contacts/ContactsView";
import type { Company, ContactWithCompany, ScrapeBatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: contacts, error }, { data: companies }, { data: batches }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*, companies(*)")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("companies").select("*").order("name").limit(2000),
      supabase
        .from("scrape_batches")
        .select("*")
        .order("imported_at", { ascending: false }),
    ]);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erreur de chargement des contacts : {error.message}
        </div>
      </div>
    );
  }

  return (
    <ContactsView
      initialContacts={(contacts ?? []) as ContactWithCompany[]}
      companies={(companies ?? []) as Company[]}
      batches={(batches ?? []) as ScrapeBatch[]}
    />
  );
}
