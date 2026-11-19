-- =====================================================================
-- seed_phase3.sql — Tâches de démonstration (Phase 3)
-- GÉNÉRÉ par tools/generate_seed_phase3_sql.py — NE PAS éditer à la main.
--
-- Pré-requis : 0001_init.sql, seed.sql, 0002_phase2.sql, seed_phase2.sql
-- et 0003_phase3.sql déjà exécutés (ce dernier dans une exécution séparée,
-- car il ajoute des valeurs d'enum utilisées ici).
--
-- 16 tâches : 3 en retard · 3 aujourd'hui · 7 à venir · 3 terminées
-- Types : {'follow_up': 3, 'call': 5, 'demo': 2, 'email': 2, 'linkedin': 2, 'other': 2}
-- Les échéances sont relatives à current_date : toujours réalistes.
-- Idempotent : rejouable sans créer de doublon.
-- =====================================================================

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '735f07d1-bc75-5f09-82b5-568e5bef0f8f'::uuid, 'Relancer Karim — pas de réponse au 1er email', 'follow_up'::task_type, 'haute'::task_priority, current_date - 8, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'af129f19-85f8-5368-995f-8a8280fe3fad'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_007'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '925fb775-116a-5e84-aaa2-98d156eee331'::uuid, 'Appeler la Boucherie Dupont (midi à éviter)', 'call'::task_type, 'haute'::task_priority, current_date - 4, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '6fc2fe8a-fe1c-5697-a04e-01c94ed0a5fd'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_006'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '9f1c2e59-326e-5f29-ba14-4ff5588d2dbe'::uuid, 'Premier contact — angle : avis de livraison en retard', 'call'::task_type, 'normale'::task_priority, current_date - 1, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'bbba5a07-b995-556f-93ac-495746dbe6e6'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_025'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select 'faa9581b-843d-5dd0-a35c-afef7282df96'::uuid, 'Relancer sur l''offre envoyée la semaine dernière', 'follow_up'::task_type, 'haute'::task_priority, current_date, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '5d5341a4-0ab6-54eb-9dd2-1cde3520614f'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_001'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select 'b1f001bc-23bb-5b4f-8f0c-a7539c3916e1'::uuid, 'Audit de la fiche Google en visio (30 min)', 'demo'::task_type, 'haute'::task_priority, current_date, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '8ee17383-ed35-570f-b511-44c34692cf01'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_016'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '726cddf2-b7ce-5dc6-b0b2-41b26335f9ab'::uuid, 'Envoyer l''email d''accroche personnalisé', 'email'::task_type, 'normale'::task_priority, current_date, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'a5097659-39fb-5a4a-afea-62d6c6f659cc'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_009'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '6d10370a-7937-5efc-8508-992acfe50934'::uuid, 'Démo produit — préparer les captures du salon', 'demo'::task_type, 'haute'::task_priority, current_date + 1, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '1a402311-0589-5222-9ef7-91c2b42228fd'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_011'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '0fe3dd9e-66aa-5d28-a160-22e4ec608aaf'::uuid, 'Relancer sur la proposition (décision attendue)', 'follow_up'::task_type, 'normale'::task_priority, current_date + 2, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '641d9ada-d3df-59a7-bc30-f5e133123d3e'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_015'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '0a0d0706-4f14-512d-b514-9e200aad5864'::uuid, 'Connexion LinkedIn + message d''introduction', 'linkedin'::task_type, 'basse'::task_priority, current_date + 3, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'bc3debdb-2ca8-5322-abf2-d4e715e181db'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_012'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '450ad6a7-a435-5ed2-bb02-a0b17a0ea94e'::uuid, 'Appeler Nadia — 9 avis seulement, fort potentiel', 'call'::task_type, 'normale'::task_priority, current_date + 4, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'c0c456f6-dedf-5bf0-a95c-2a05209c7961'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_004'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select 'cad3d936-d652-5203-82fb-ba00d9350190'::uuid, 'Appeler le serrurier — argument urgence 24/7', 'call'::task_type, 'normale'::task_priority, current_date + 5, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '1e168d64-d2cf-53c9-b8da-ddb3766dde4d'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_029'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '1e3005bb-78ff-57ed-8f00-1b062052390b'::uuid, 'Trouver l''email de Yanis avant de prospecter', 'other'::task_type, 'basse'::task_priority, current_date + 7, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = 'aa5075b3-61c2-5884-a5fb-f4e0d4061c4f'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_013'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '543c7226-2583-5c09-b155-dbf4c6448ae0'::uuid, 'Message LinkedIn — bijouterie, période de fêtes', 'linkedin'::task_type, 'normale'::task_priority, current_date + 12, 'todo'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '51bafd28-2087-5941-96cc-9e0bd5f6f16d'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_027'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select 'a05dbea4-e22c-5e4c-a255-2462f1a41c81'::uuid, 'Appel d''onboarding après signature', 'call'::task_type, 'normale'::task_priority, current_date - 10, 'done'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '1e0f3f7b-c936-5cb3-9402-a6db7283e79c'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_021'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select 'fe873e5d-cebc-5fd8-b793-e9eb2ff25536'::uuid, 'Envoyer le contrat à signer', 'email'::task_type, 'haute'::task_priority, current_date - 6, 'done'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '6d270fed-c167-5fda-8011-eb30ceb2662c'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_018'
on conflict (id) do nothing;

insert into public.tasks
  (id, title, type, priority, due_date, status, company_id, contact_id)
select '317c97a4-6e29-5f5e-8e2b-881ac74ff7d2'::uuid, 'Noter la raison de la perte et clôturer', 'other'::task_type, 'basse'::task_priority, current_date - 3, 'done'::task_status, co.id, (select ct.id from public.contacts ct where ct.id = '08edbf6e-95ba-5c05-a530-76b80df8da13'::uuid)
from public.companies co
where co.google_place_id = 'demo_place_026'
on conflict (id) do nothing;
