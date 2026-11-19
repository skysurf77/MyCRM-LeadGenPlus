-- =====================================================================
-- 0003_phase3.sql — Tâches & relances commerciales (Phase 3)
-- À exécuter APRÈS 0002_phase2.sql. Idempotent (re-jouable sans risque).
--
-- ⚠ IMPORTANT : exécuter ce script SEUL, puis seed_phase3.sql dans une
--   seconde exécution. Postgres interdit d'utiliser une valeur d'enum
--   ajoutée par `alter type ... add value` dans la même transaction.
-- =====================================================================

-- ---------------------------------------------------------------------
-- task_type — ajout des canaux manquants
--   call = Appel · email = Email · linkedin = LinkedIn
--   follow_up = Relance · demo = Audit / Démo · other = Autre
-- ---------------------------------------------------------------------
alter type task_type add value if not exists 'linkedin';
alter type task_type add value if not exists 'demo';

-- ---------------------------------------------------------------------
-- task_priority — urgence commerciale
-- ---------------------------------------------------------------------
do $$ begin
  create type task_priority as enum ('basse', 'normale', 'haute');
exception when duplicate_object then null; end $$;

alter table public.tasks
  add column if not exists priority task_priority not null default 'normale';

-- Horodatage de clôture : alimente les statistiques de l'onglet Analytics.
alter table public.tasks
  add column if not exists completed_at timestamptz;

-- ---------------------------------------------------------------------
-- Index de lecture (tri par urgence, jointures depuis les tiroirs)
-- ---------------------------------------------------------------------
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_contact on public.tasks (contact_id);
create index if not exists idx_tasks_deal on public.tasks (deal_id);

-- ---------------------------------------------------------------------
-- Trigger : completed_at suit le passage à l'état « terminée ».
-- ---------------------------------------------------------------------
create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  -- OLD n'existe pas sur INSERT : on teste TG_OP avant d'y toucher.
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  elsif new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = now();
  elsif new.status = 'todo' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_completed_at on public.tasks;
create trigger trg_tasks_completed_at
  before insert or update on public.tasks
  for each row execute function public.sync_task_completed_at();

comment on column public.tasks.priority is
  'Urgence commerciale : basse / normale / haute.';
comment on column public.tasks.completed_at is
  'Rempli automatiquement au passage en statut « done ».';

-- RLS : la policy `team_all` de 0001_init.sql couvre déjà `tasks`.
