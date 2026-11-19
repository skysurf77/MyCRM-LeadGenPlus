-- =====================================================================
-- 0001_init.sql — Schéma initial de MyCRM LeadGenPlus (Phase 1)
-- Postgres / Supabase. Modèle mono-tenant (une seule équipe).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
do $$ begin
  create type lead_tier as enum ('A', 'B', 'C', 'D');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lifecycle_status as enum ('nouveau', 'qualifie', 'en_cours', 'client', 'rejete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrichment_status as enum ('a_enrichir', 'en_cours', 'enrichi', 'echec');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('to_contact', 'outreach_sent', 'demo_call', 'proposal_sent', 'closed_won', 'closed_lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type as enum ('call', 'email', 'follow_up', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type batch_source as enum ('google_maps', 'custom');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles — un enregistrement par utilisateur (miroir de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text default 'membre',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- scrape_batches — campagnes de scraping
-- ---------------------------------------------------------------------
create table if not exists public.scrape_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source batch_source not null default 'google_maps',
  city text,
  category text,
  rows_count integer not null default 0,
  imported_by uuid references public.profiles (id) on delete set null,
  imported_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- companies — entreprises (entité racine du filtrage)
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_place_id text unique,
  gbp_url text,
  website text,
  phone text,
  address text,
  city text,
  postal_code text,
  category text,
  rating numeric(2, 1),
  reviews_count integer,
  lead_score integer not null default 0,
  lead_tier lead_tier not null default 'D',
  score_breakdown jsonb,
  lifecycle_status lifecycle_status not null default 'nouveau',
  owner_id uuid references public.profiles (id) on delete set null,
  batch_id uuid references public.scrape_batches (id) on delete set null,
  raw_data jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_city on public.companies (city);
create index if not exists idx_companies_category on public.companies (category);
create index if not exists idx_companies_tier on public.companies (lead_tier);
create index if not exists idx_companies_score on public.companies (lead_score);
create index if not exists idx_companies_batch on public.companies (batch_id);
create index if not exists idx_companies_owner on public.companies (owner_id);

-- ---------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  linkedin_url text,
  is_decision_maker boolean not null default false,
  enrichment_status enrichment_status not null default 'a_enrichir',
  created_at timestamptz not null default now()
);

create index if not exists idx_contacts_company on public.contacts (company_id);

-- ---------------------------------------------------------------------
-- deals — pipeline de vente
-- ---------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  stage deal_stage not null default 'to_contact',
  amount numeric(12, 2),
  owner_id uuid references public.profiles (id) on delete set null,
  expected_close_date date,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_company on public.deals (company_id);
create index if not exists idx_deals_stage on public.deals (stage);
create index if not exists idx_deals_owner on public.deals (owner_id);

-- ---------------------------------------------------------------------
-- tasks — suivi / rappels (assignables aux collègues)
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type task_type not null default 'follow_up',
  due_date date,
  status task_status not null default 'todo',
  assigned_to uuid references public.profiles (id) on delete set null,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_assigned on public.tasks (assigned_to);
create index if not exists idx_tasks_company on public.tasks (company_id);
create index if not exists idx_tasks_status on public.tasks (status);

-- ---------------------------------------------------------------------
-- activities — journal (phase 2, créé dès maintenant)
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  type text not null default 'note',
  body text,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_company on public.activities (company_id);

-- ---------------------------------------------------------------------
-- Trigger : updated_at automatique sur deals
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger : création automatique d'un profil à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- RLS — modèle mono-tenant : tout utilisateur authentifié de l'équipe
-- a accès en lecture/écriture. L'accès anonyme est refusé partout.
-- (Granularité par personne possible en phase ultérieure.)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.scrape_batches enable row level security;
alter table public.companies      enable row level security;
alter table public.contacts       enable row level security;
alter table public.deals          enable row level security;
alter table public.tasks          enable row level security;
alter table public.activities     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'scrape_batches', 'companies', 'contacts', 'deals', 'tasks', 'activities'
  ]
  loop
    execute format('drop policy if exists team_all on public.%I;', t);
    execute format(
      'create policy team_all on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
