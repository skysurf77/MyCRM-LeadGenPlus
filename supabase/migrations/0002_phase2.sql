-- =====================================================================
-- 0002_phase2.sql — Contacts enrichis + Pipeline commercial (Phase 2)
-- À exécuter APRÈS 0001_init.sql. Idempotent (re-jouable sans risque).
-- =====================================================================

-- ---------------------------------------------------------------------
-- contacts — champs destinés à l'automatisation n8n / Apify
-- ---------------------------------------------------------------------
-- Texte du dernier avis négatif récupéré sur la fiche Google : sert de
-- matière première à l'accroche personnalisée.
alter table public.contacts
  add column if not exists last_negative_review text;

-- Phrase d'accroche générée (IA) à partir de l'avis négatif / du contexte.
alter table public.contacts
  add column if not exists ai_icebreaker text;

-- Horodatage du dernier passage d'enrichissement (écrit par n8n).
alter table public.contacts
  add column if not exists enriched_at timestamptz;

create index if not exists idx_contacts_enrichment
  on public.contacts (enrichment_status);

-- ---------------------------------------------------------------------
-- deals — abonnement mensuel estimé + contact rattaché
-- ---------------------------------------------------------------------
-- MRR = Monthly Recurring Revenue, le prix mensuel de l'abonnement vendu.
-- (`amount` reste disponible pour une valeur totale de contrat, non utilisée
--  par l'UI Phase 2.)
alter table public.deals
  add column if not exists mrr numeric(10, 2);

alter table public.deals
  add column if not exists primary_contact_id uuid
  references public.contacts (id) on delete set null;

create index if not exists idx_deals_primary_contact
  on public.deals (primary_contact_id);

-- Une seule opportunité ouverte par entreprise : évite les doublons quand on
-- clique plusieurs fois sur « Envoyer dans le Pipeline ».
create unique index if not exists uniq_deals_company_open
  on public.deals (company_id)
  where stage not in ('closed_won', 'closed_lost');

comment on column public.deals.mrr is
  'Abonnement mensuel estimé en euros (MRR).';
comment on column public.contacts.ai_icebreaker is
  'Phrase d''accroche personnalisée générée par l''automatisation.';
comment on column public.contacts.last_negative_review is
  'Texte du dernier avis négatif Google, matière première de l''accroche.';

-- ---------------------------------------------------------------------
-- Rappel : la RLS et la policy `team_all` de 0001_init.sql couvrent déjà
-- `contacts` et `deals`. Aucune nouvelle policy nécessaire.
-- ---------------------------------------------------------------------
