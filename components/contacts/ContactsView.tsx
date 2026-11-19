"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFilters, useFilterUrlSync } from "@/store/useFilters";
import { matchesContact } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { FacetFilter, type FacetOption } from "@/components/FacetFilter";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactDrawer } from "@/components/contacts/ContactDrawer";
import {
  ENRICHMENT_LABELS,
  type Company,
  type Contact,
  type ContactWithCompany,
  type EnrichmentStatus,
  type ScrapeBatch,
} from "@/lib/types";

const ENRICHMENT_OPTIONS = Object.keys(ENRICHMENT_LABELS) as EnrichmentStatus[];

export function ContactsView({
  initialContacts,
  companies,
  batches,
}: {
  initialContacts: ContactWithCompany[];
  companies: Company[];
  batches: ScrapeBatch[];
}) {
  const [contacts, setContacts] = useState<ContactWithCompany[]>(initialContacts);
  const [editing, setEditing] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const supabase = createClient();

  const filters = useFilters();
  useFilterUrlSync();

  const companyOptions = useMemo(
    () =>
      companies
        .map((c) => ({ id: c.id, name: c.name, city: c.city }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [companies]
  );

  // Facettes dérivées des entreprises rattachées aux contacts.
  const cityOptions = useMemo(
    () => facet(contacts, (c) => c.companies?.city ?? null),
    [contacts]
  );
  const categoryOptions = useMemo(
    () => facet(contacts, (c) => c.companies?.category ?? null),
    [contacts]
  );
  const batchOptions: FacetOption[] = useMemo(
    () => batches.map((b) => ({ value: b.id, label: b.name })),
    [batches]
  );

  const snapshot = filters.snapshot();
  const filtered = useMemo(
    () => contacts.filter((c) => matchesContact(c, snapshot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, JSON.stringify(snapshot)]
  );

  const stats = useMemo(() => {
    let decideurs = 0;
    let avecEmail = 0;
    let avecAccroche = 0;
    for (const c of filtered) {
      if (c.is_decision_maker) decideurs++;
      if (c.email) avecEmail++;
      if (c.ai_icebreaker) avecAccroche++;
    }
    return { decideurs, avecEmail, avecAccroche };
  }, [filtered]);

  async function updateContact(id: string, patch: Partial<ContactWithCompany>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { companies: _join, ...dbPatch } = patch as Record<string, unknown>;
    const { error } = await supabase.from("contacts").update(dbPatch).eq("id", id);
    if (error) await refetch();
  }

  async function refetch() {
    const { data } = await supabase
      .from("contacts")
      .select("*, companies(*)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data) setContacts(data as ContactWithCompany[]);
  }

  function handleSaved(saved: Contact) {
    setContacts((prev) => {
      const existing = prev.find((c) => c.id === saved.id);
      if (existing) {
        return prev.map((c) =>
          c.id === saved.id ? { ...saved, companies: existing.companies } : c
        );
      }
      const company = companies.find((c) => c.id === saved.company_id) ?? null;
      return [{ ...saved, companies: company }, ...prev];
    });
  }

  function openNew() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(c: ContactWithCompany) {
    setEditing(c);
    setDrawerOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 pt-4">
        <div className="pb-3">
          <h2 className="text-lg font-semibold">
            {filtered.length === contacts.length
              ? `${contacts.length} contacts`
              : `${filtered.length} / ${contacts.length} contacts`}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{stats.decideurs} décideurs</span>
            <span>·</span>
            <span>{stats.avecEmail} avec email</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              {stats.avecAccroche} avec accroche
            </span>
          </div>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4" /> Nouveau contact
        </Button>
      </div>

      <FilterBar
        cities={cityOptions}
        categories={categoryOptions}
        batches={batchOptions}
        searchPlaceholder="Rechercher un contact, une entreprise…"
        extra={
          <FacetFilter
            label="Enrichissement"
            options={ENRICHMENT_OPTIONS.map((s) => ({
              value: s,
              label: ENRICHMENT_LABELS[s],
              count: contacts.filter((c) => c.enrichment_status === s).length,
            }))}
            selected={filters.enrichmentStatuses}
            onToggle={(v) => filters.toggleEnrichment(v as EnrichmentStatus)}
          />
        }
      />

      {filtered.length === 0 ? (
        <EmptyState hasData={contacts.length > 0} onNew={openNew} />
      ) : (
        <div className="min-h-0 flex-1">
          <ContactsTable
            data={filtered}
            onRowClick={openEdit}
            onInlineUpdate={updateContact}
          />
        </div>
      )}

      <ContactDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        contact={editing}
        companyId={editing?.company_id ?? null}
        companyName={editing?.companies?.name ?? null}
        companyOptions={companyOptions}
        onSaved={handleSaved}
        onDeleted={(id) => setContacts((prev) => prev.filter((c) => c.id !== id))}
      />
    </div>
  );
}

function facet(
  contacts: ContactWithCompany[],
  pick: (c: ContactWithCompany) => string | null
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const v = pick(c);
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
        <Users className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium">
          {hasData ? "Aucun contact ne correspond aux filtres" : "Aucun contact"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasData
            ? "Ajustez ou effacez les filtres pour voir plus de résultats."
            : "Ajoutez un décideur, ou lancez l'enrichissement depuis une fiche entreprise."}
        </p>
      </div>
      {!hasData && (
        <Button onClick={onNew}>
          <UserPlus className="h-4 w-4" /> Nouveau contact
        </Button>
      )}
    </div>
  );
}
