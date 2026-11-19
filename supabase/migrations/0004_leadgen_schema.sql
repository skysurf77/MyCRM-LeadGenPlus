-- =====================================================================
-- 0004_leadgen_schema.sql — Ingestion des leads réels de LeadGenEngine
-- À exécuter APRÈS 0003_phase3.sql. Idempotent (re-jouable sans risque).
--
-- Modèle complet de prospection Google Business Profile produit par le
-- moteur externe LeadGenEngine (scraping Apify + enrichissement IA).
-- Aucune colonne existante n'est modifiée ni supprimée.
--
-- NOTE : contrairement à 0003, ce script ne touche à aucun enum. Il peut
-- donc être exécuté en une seule fois.
-- =====================================================================

-- ---------------------------------------------------------------------
-- companies — identité & présence locale
-- ---------------------------------------------------------------------
-- La déduplication continue de reposer sur `google_place_id` (0001, unique) :
-- la route d'ingestion accepte `place_id` dans son payload et le mappe ici.
-- Aucune seconde colonne d'identifiant Google n'est créée.

alter table public.companies
  add column if not exists department text;

alter table public.companies
  add column if not exists lat double precision;

alter table public.companies
  add column if not exists lng double precision;

-- Fiche revendiquée par le commerçant ? false = angle de vente immédiat.
alter table public.companies
  add column if not exists is_claimed boolean;

-- Horaires d'ouverture tels que renvoyés par Google (forme libre).
alter table public.companies
  add column if not exists opening_hours jsonb;

alter table public.companies
  add column if not exists siren text;

alter table public.companies
  add column if not exists siret text;

-- Nombre d'établissements du même réseau : > 1 = opportunité multi-sites.
alter table public.companies
  add column if not exists multi_location_count integer default 1;

-- ---------------------------------------------------------------------
-- companies — audit des avis & signaux de douleur
-- ---------------------------------------------------------------------
alter table public.companies
  add column if not exists reviews_last_90_days integer;

alter table public.companies
  add column if not exists last_review_date date;

alter table public.companies
  add column if not exists negative_reviews_count_6m integer;

-- Pourcentage (0-100) d'avis auxquels le propriétaire a répondu.
alter table public.companies
  add column if not exists owner_response_rate integer;

alter table public.companies
  add column if not exists last_negative_review_text text;

alter table public.companies
  add column if not exists last_negative_review_date date;

-- Nombre d'avis 5 étoiles à obtenir pour passer au palier de note suivant.
alter table public.companies
  add column if not exists reviews_needed_for_next_tier integer;

-- Benchmark local, ex. {"avg_rating": 4.6, "avg_reviews": 145, "top_3": [...]}
alter table public.companies
  add column if not exists local_competitor_benchmark jsonb;

-- ---------------------------------------------------------------------
-- companies — scoring & outreach IA
-- ---------------------------------------------------------------------
-- /!\ `score_breakdown` existe DEJA en jsonb depuis 0001 (détail chiffré du
--     score maison, affiché en barres dans la fiche). Un
--     `add column if not exists score_breakdown text` serait silencieusement
--     ignoré par Postgres. L'explication textuelle de LeadGenEngine reçoit
--     donc sa propre colonne, et les deux coexistent.
alter table public.companies
  add column if not exists score_breakdown_text text;

alter table public.companies
  add column if not exists recommended_angle text;

alter table public.companies
  add column if not exists call_script_hook text;

-- Accroche IA au niveau de la FICHE (celle de `contacts` reste au niveau
-- de la personne, cf. 0002_phase2.sql).
alter table public.companies
  add column if not exists ai_icebreaker text;

-- ---------------------------------------------------------------------
-- companies — traçabilité
-- ---------------------------------------------------------------------
-- /!\ Colonne ajoutée SANS `default`, puis défaut posé dans un second temps.
--     Depuis Postgres 11, `add column ... default` RETRO-REMPLIT toutes les
--     lignes existantes : les 30 commerces de seed et les imports CSV
--     seraient étiquetés à tort comme venant de LeadGenEngine. En deux
--     étapes, l'existant reste `null` et seules les nouvelles lignes
--     portent le défaut.
alter table public.companies
  add column if not exists source text;

alter table public.companies
  alter column source set default 'LeadGenEngine_Apify_GMaps';

alter table public.companies
  add column if not exists scraped_at timestamptz;

-- ---------------------------------------------------------------------
-- companies — contraintes de cohérence (blocs séparés = idempotents)
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.companies
    add constraint companies_owner_response_rate_range
    check (owner_response_rate is null or owner_response_rate between 0 and 100);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.companies
    add constraint companies_multi_location_count_positive
    check (multi_location_count is null or multi_location_count >= 0);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- companies — index de lecture (segmentation à venir)
-- ---------------------------------------------------------------------
create index if not exists idx_companies_department on public.companies (department);
create index if not exists idx_companies_source on public.companies (source);

-- ---------------------------------------------------------------------
-- contacts — vérification d'e-mail & coordonnées directes
-- ---------------------------------------------------------------------
alter table public.contacts
  add column if not exists email_verification_status text;

do $$ begin
  alter table public.contacts
    add constraint contacts_email_verification_status_values
    check (
      email_verification_status is null
      or email_verification_status in ('valid', 'catch_all', 'invalid', 'unknown')
    );
exception when duplicate_object then null; end $$;

alter table public.contacts
  add column if not exists direct_phone text;

-- Présent depuis 0001 : conservé ici par documentation d'intention (no-op).
alter table public.contacts
  add column if not exists linkedin_url text;

-- Garde-fou d'intégrité : un e-mail au plus par entreprise. Partiel, car un
-- contact sans e-mail reste légitime. Les e-mails sont normalisés en
-- minuscules côté route.
--
-- /!\ Cet index n'est PAS utilisable comme cible de `ON CONFLICT
--     (company_id, email)` : Postgres n'infère un index partiel que si le
--     prédicat de l'index est répété dans la requête, ce que PostgREST ne
--     sait pas émettre (erreur 42P10). La route d'ingestion fait donc un
--     select puis un update/insert explicite, et non un upsert.
create unique index if not exists uniq_contacts_company_email
  on public.contacts (company_id, email)
  where email is not null;

-- ---------------------------------------------------------------------
-- Commentaires de colonnes
-- ---------------------------------------------------------------------
comment on column public.companies.is_claimed is
  'Fiche Google revendiquée par le commerçant. false = argument de vente direct.';
comment on column public.companies.multi_location_count is
  'Nombre d''établissements du réseau (1 = commerce indépendant).';
comment on column public.companies.owner_response_rate is
  'Pourcentage (0-100) d''avis auxquels le propriétaire a répondu.';
comment on column public.companies.reviews_needed_for_next_tier is
  'Nombre d''avis 5 étoiles à obtenir pour atteindre le palier de note suivant.';
comment on column public.companies.local_competitor_benchmark is
  'Moyennes du secteur local : {"avg_rating": …, "avg_reviews": …, "top_3": [...]}.';
comment on column public.companies.score_breakdown_text is
  'Explication textuelle du score rédigée par LeadGenEngine. Distincte de `score_breakdown` (jsonb, détail chiffré du score maison).';
comment on column public.companies.recommended_angle is
  'Angle d''attaque commercial recommandé par LeadGenEngine.';
comment on column public.companies.call_script_hook is
  'Phrase d''ouverture d''appel prête à être prononcée.';
comment on column public.companies.ai_icebreaker is
  'Accroche IA au niveau de la fiche Google (celle de `contacts` vise la personne).';
comment on column public.companies.source is
  'Origine de la fiche. null = seed ou import CSV antérieur à LeadGenEngine.';
comment on column public.companies.scraped_at is
  'Horodatage du scraping LeadGenEngine ayant produit ces données.';
comment on column public.contacts.email_verification_status is
  'Résultat de la vérification d''e-mail : valid / catch_all / invalid / unknown.';
comment on column public.contacts.direct_phone is
  'Ligne directe du décideur, distincte du standard de l''établissement.';

-- ---------------------------------------------------------------------
-- Rappel : la RLS et la policy `team_all` de 0001_init.sql couvrent déjà
-- `companies` et `contacts`. Aucune nouvelle policy nécessaire.
-- ---------------------------------------------------------------------
