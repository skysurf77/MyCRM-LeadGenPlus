-- =====================================================================
-- seed_phase2.sql — Contacts & Pipeline de démonstration (Phase 2)
-- GÉNÉRÉ par tools/generate_seed_phase2_sql.py — NE PAS éditer à la main.
--
-- Pré-requis : 0001_init.sql, 0002_phase2.sql et seed.sql déjà exécutés.
-- 23 contacts · 12 opportunités · 1998 €/mois cumulés
-- Enrichissement : {'enrichi': 13, 'a_enrichir': 6, 'echec': 2, 'en_cours': 2}
-- Étapes du pipeline : {'to_contact': 3, 'closed_lost': 1, 'proposal_sent': 2, 'closed_won': 2, 'outreach_sent': 2, 'demo_call': 2}
-- Idempotent : rejouable sans créer de doublon.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Contacts (décideurs rattachés aux commerces par google_place_id)
-- ---------------------------------------------------------------------
insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '5d5341a4-0ab6-54eb-9dd2-1cde3520614f'::uuid, co.id, 'Julien', 'Moreau', 'Gérant', 'julien.moreau@lepetitbouchon-lyon.fr', '06 12 45 78 90', 'https://www.linkedin.com/in/julien-moreau-bouchon', true, 'enrichi'::enrichment_status, 'Bonne cuisine mais service très lent le midi, nous avons attendu 45 minutes entre l''entrée et le plat.', 'J''ai vu que Le Petit Bouchon affiche 3,8/5 avec seulement 24 avis — vos clients satisfaits ne laissent pas de trace, et le seul avis visible parle d''attente en salle.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_001'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '44baf6e2-5f9a-583a-a021-856fdd69f852'::uuid, co.id, 'Sophie', 'Moreau', 'Responsable salle', NULL, '06 12 45 78 91', NULL, false, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_001'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'c0c456f6-dedf-5bf0-a95c-2a05209c7961'::uuid, co.id, 'Nadia', 'Benali', 'Propriétaire', NULL, '06 23 56 89 01', NULL, true, 'enrichi'::enrichment_status, NULL, 'Chez Mémé n''a que 9 avis Google alors que vous servez des dizaines de clients par semaine : vos habitués sont votre meilleur argument, encore faut-il qu''ils s''expriment.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_004'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '6fc2fe8a-fe1c-5697-a04e-01c94ed0a5fd'::uuid, co.id, 'Marc', 'Dupont', 'Artisan boucher, gérant', NULL, '06 34 67 90 12', NULL, true, 'enrichi'::enrichment_status, 'Produits excellents mais la file d''attente du samedi est interminable.', '4,4/5 pour 48 avis : la Boucherie Dupont est juste sous le seuil où Google met en avant un commerce dans le pack local.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_006'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'af129f19-85f8-5368-995f-8a8280fe3fad'::uuid, co.id, 'Karim', 'Haddad', 'Gérant', 'contact@barlezinc-paris.fr', '06 45 78 01 23', NULL, true, 'enrichi'::enrichment_status, 'Accueil désagréable, serveur pressé, musique beaucoup trop forte. Je ne reviendrai pas.', 'Le Zinc est à 3,1/5 sur 75 avis : quelques avis négatifs anciens pèsent lourd et tirent la note vers le bas — ce sont eux que vos futurs clients lisent en premier.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_007'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '875b0a45-6ccd-54bc-8ee1-15187836ddca'::uuid, co.id, 'Mathieu', 'Roy', 'Gérant', NULL, NULL, NULL, true, 'echec'::enrichment_status, 'Fermé alors que les horaires indiquaient ouvert. Fiche Google pas à jour.', NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_008'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'a5097659-39fb-5a4a-afea-62d6c6f659cc'::uuid, co.id, 'Élodie', 'Garnier', 'Gérante', 'elodie@primeurbio-nice.fr', '06 56 89 12 34', 'https://www.linkedin.com/in/elodie-garnier-bio', true, 'enrichi'::enrichment_status, NULL, '4,7/5 mais seulement 33 avis : votre réputation est excellente, elle est juste invisible face aux enseignes qui en cumulent 300.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_009'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '1a402311-0589-5222-9ef7-91c2b42228fd'::uuid, co.id, 'Camille', 'Rousseau', 'Fondatrice', 'camille@eclat-coiffure.fr', '06 67 90 23 45', 'https://www.linkedin.com/in/camille-rousseau-eclat', true, 'enrichi'::enrichment_status, 'Coupe correcte mais prix annoncé au téléphone différent du prix payé.', 'Salon Éclat : 3,9/5 sur 27 avis dans le 4e, là où vos concurrents directs dépassent les 150 avis. C''est le premier critère de choix d''une nouvelle cliente.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_011'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'bc3debdb-2ca8-5322-abf2-d4e715e181db'::uuid, co.id, 'Laetitia', 'Mercier', 'Directrice', 'direction@institut-zen-lyon.fr', NULL, NULL, true, 'en_cours'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_012'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'aa5075b3-61c2-5884-a5fb-f4e0d4061c4f'::uuid, co.id, 'Yanis', 'Belkacem', 'Gérant', NULL, '06 78 01 34 56', NULL, true, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_013'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '641d9ada-d3df-59a7-bc30-f5e133123d3e'::uuid, co.id, 'Thomas', 'Lefevre', 'Kinésithérapeute associé', 't.lefevre@kine-sante-lille.fr', '06 89 12 45 67', 'https://www.linkedin.com/in/thomas-lefevre-kine', true, 'enrichi'::enrichment_status, NULL, '4,9/5 pour 15 avis seulement : votre cabinet est excellent sur le papier mais invisible sur Google face aux centres qui en affichent 200.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_015'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '8ee17383-ed35-570f-b511-44c34692cf01'::uuid, co.id, 'Hélène', 'Chauvet', 'Opticienne-gérante', 'h.chauvet@visionplus-nantes.fr', '06 90 23 56 78', NULL, true, 'enrichi'::enrichment_status, 'Délai de livraison des verres bien plus long qu''annoncé, et aucune information entre-temps.', 'Vision Plus est à 3,4/5 : deux avis sur les délais de livraison plombent la note alors que vos clients réguliers, eux, ne postent rien.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_016'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '742bf8ab-baf9-5930-8a04-ff133865172c'::uuid, co.id, 'Philippe', 'Arnaud', 'Chirurgien-dentiste', NULL, NULL, NULL, true, 'echec'::enrichment_status, 'Secrétariat injoignable, rendez-vous annulé la veille sans explication.', NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_017'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '6d270fed-c167-5fda-8011-eb30ceb2662c'::uuid, co.id, 'Claire', 'Fontaine', 'Ostéopathe D.O.', 'claire@osteo-bienetre-strasbourg.fr', '06 01 34 67 89', 'https://www.linkedin.com/in/claire-fontaine-osteo', true, 'enrichi'::enrichment_status, NULL, '8 avis pour un cabinet installé depuis des années : chaque patient satisfait qui ne laisse rien est un rendez-vous que vous ne prendrez pas.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_018'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '1e0f3f7b-c936-5cb3-9402-a6db7283e79c'::uuid, co.id, 'Stéphane', 'Vidal', 'Gérant', 'contact@garage-autoexpert.fr', '06 12 34 56 78', 'https://www.linkedin.com/in/stephane-vidal-auto', true, 'enrichi'::enrichment_status, 'Devis dépassé de 200 € sans prévenir. Travail correct mais communication à revoir.', '3,7/5 sur 88 avis : pour un garage, la note Google est le premier filtre. Quelques avis sur les devis suffisent à faire basculer un client vers le concurrent.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_021'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'e5d99184-0684-5d45-ba49-005f135e7a53'::uuid, co.id, 'Nathalie', 'Vidal', 'Responsable administrative', 'admin@garage-autoexpert.fr', NULL, NULL, false, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_021'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '2140cedb-f661-584a-b8c7-70ab6e13496d'::uuid, co.id, 'Olivier', 'Brun', 'Gérant', NULL, '06 23 45 67 89', NULL, true, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_022'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'c47d788d-2767-53eb-a97a-c8249824d62f'::uuid, co.id, 'Farid', 'Amrani', 'Gérant', NULL, '06 34 56 78 90', NULL, true, 'en_cours'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_023'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select 'bbba5a07-b995-556f-93ac-495746dbe6e6'::uuid, co.id, 'Amandine', 'Leroy', 'Fleuriste-gérante', 'amandine@fleurs-passion-lille.fr', '06 45 67 89 01', NULL, true, 'enrichi'::enrichment_status, 'Bouquet livré fané et avec deux jours de retard pour un anniversaire.', 'Fleurs & Passion est à 3,3/5 : un incident de livraison reste en haut de votre fiche Google des mois après, pendant que vos clients heureux repartent sans rien poster.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_025'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '08edbf6e-95ba-5c05-a530-76b80df8da13'::uuid, co.id, 'Vincent', 'Dubois', 'Directeur d''agence', 'v.dubois@immo-prestige-nantes.fr', '06 56 78 90 12', 'https://www.linkedin.com/in/vincent-dubois-immo', true, 'enrichi'::enrichment_status, 'Aucun suivi après la signature du mandat, impossible d''obtenir un retour sur les visites.', '2,8/5 sur 140 avis en immobilier, c''est un frein direct à la prise de mandat : les vendeurs comparent les agences sur Google avant de vous appeler.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_026'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '51bafd28-2087-5941-96cc-9e0bd5f6f16d'::uuid, co.id, 'Isabelle', 'Nguyen', 'Gérante', NULL, '06 67 89 01 23', NULL, true, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_027'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '1e168d64-d2cf-53c9-b8da-ddb3766dde4d'::uuid, co.id, 'Driss', 'Alaoui', 'Gérant', NULL, '06 78 90 12 34', NULL, true, 'enrichi'::enrichment_status, NULL, '3 avis seulement pour un service d''urgence 24/7 : quand quelqu''un est bloqué dehors à minuit, il appelle le serrurier le mieux noté, pas le plus proche.', now() - interval '3 days'
from public.companies co
where co.google_place_id = 'demo_place_029'
on conflict (id) do nothing;

insert into public.contacts
  (id, company_id, first_name, last_name, title, email, phone,
   linkedin_url, is_decision_maker, enrichment_status,
   last_negative_review, ai_icebreaker, enriched_at)
select '1f451d34-e8a4-5a42-ad4b-95d69d3de531'::uuid, co.id, 'Laurent', 'Petit', 'Directeur', 'l.petit@decomaison-concept.fr', NULL, NULL, true, 'a_enrichir'::enrichment_status, NULL, NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_030'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Opportunités du pipeline
-- ---------------------------------------------------------------------
insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '27b578be-80b8-5438-a647-a7d23aa7fe5e'::uuid, co.id, 'Abonnement avis — Le Petit Bouchon', 'proposal_sent'::deal_stage, 199, (select ct.id from public.contacts ct where ct.id = '5d5341a4-0ab6-54eb-9dd2-1cde3520614f'::uuid), '2026-12-05'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_001'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'cd7dd85d-1e6b-51c6-ac89-6eb2c8b08a6c'::uuid, co.id, 'Abonnement avis — Salon Éclat Coiffure', 'demo_call'::deal_stage, 149, (select ct.id from public.contacts ct where ct.id = '1a402311-0589-5222-9ef7-91c2b42228fd'::uuid), '2026-12-12'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_011'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'd87b18ec-cfb3-5b9f-8a65-390695de38ec'::uuid, co.id, 'Abonnement avis — Bar Le Zinc', 'outreach_sent'::deal_stage, 149, (select ct.id from public.contacts ct where ct.id = 'af129f19-85f8-5368-995f-8a8280fe3fad'::uuid), '2026-12-20'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_007'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '1494b347-00c5-559b-8798-54794c3fec56'::uuid, co.id, 'Abonnement avis — Garage Auto Expert', 'closed_won'::deal_stage, 249, (select ct.id from public.contacts ct where ct.id = '1e0f3f7b-c936-5cb3-9402-a6db7283e79c'::uuid), '2026-11-10'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_021'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '0dd3b20d-dc37-5ee3-89d7-7deb1fc13d71'::uuid, co.id, 'Abonnement avis — Opticien Vision Plus', 'demo_call'::deal_stage, 199, (select ct.id from public.contacts ct where ct.id = '8ee17383-ed35-570f-b511-44c34692cf01'::uuid), '2026-12-15'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_016'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '8134d3a1-f194-542b-aab7-7b654e1dd17e'::uuid, co.id, 'Abonnement avis — Fleurs & Passion', 'to_contact'::deal_stage, 99, (select ct.id from public.contacts ct where ct.id = 'bbba5a07-b995-556f-93ac-495746dbe6e6'::uuid), NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_025'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '94f90df9-c8d5-5ffc-a8dc-243e0c9d79f6'::uuid, co.id, 'Abonnement avis — Primeur Bio du Vieux-Nice', 'to_contact'::deal_stage, 129, (select ct.id from public.contacts ct where ct.id = 'a5097659-39fb-5a4a-afea-62d6c6f659cc'::uuid), NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_009'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select '78726c51-c402-5a99-a9f3-9a19c5676c94'::uuid, co.id, 'Abonnement avis — Boucherie Dupont', 'outreach_sent'::deal_stage, 129, (select ct.id from public.contacts ct where ct.id = '6fc2fe8a-fe1c-5697-a04e-01c94ed0a5fd'::uuid), '2026-12-18'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_006'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'f7b506b9-7b82-5f4f-8585-376313886f21'::uuid, co.id, 'Abonnement avis — Cabinet Kiné Santé', 'proposal_sent'::deal_stage, 199, (select ct.id from public.contacts ct where ct.id = '641d9ada-d3df-59a7-bc30-f5e133123d3e'::uuid), '2026-12-08'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_015'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'd245b49d-09b5-594d-9450-39ca812ffcf4'::uuid, co.id, 'Abonnement avis — Agence Immo Prestige', 'closed_lost'::deal_stage, 249, (select ct.id from public.contacts ct where ct.id = '08edbf6e-95ba-5c05-a530-76b80df8da13'::uuid), '2026-11-05'::date, 'Gère déjà les avis en interne via un prestataire web.'
from public.companies co
where co.google_place_id = 'demo_place_026'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'be48a6e0-9b95-5b90-92d6-3b2a4a3fabe3'::uuid, co.id, 'Abonnement avis — Ostéo Bien-Être', 'closed_won'::deal_stage, 149, (select ct.id from public.contacts ct where ct.id = '6d270fed-c167-5fda-8011-eb30ceb2662c'::uuid), '2026-11-12'::date, NULL
from public.companies co
where co.google_place_id = 'demo_place_018'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;

insert into public.deals
  (id, company_id, title, stage, mrr, primary_contact_id,
   expected_close_date, lost_reason)
select 'c3886494-2a31-50de-864b-f205cfa1fc96'::uuid, co.id, 'Abonnement avis — Chez Mémé Traiteur', 'to_contact'::deal_stage, 99, (select ct.id from public.contacts ct where ct.id = 'c0c456f6-dedf-5bf0-a95c-2a05209c7961'::uuid), NULL, NULL
from public.companies co
where co.google_place_id = 'demo_place_004'
  and not exists (select 1 from public.deals dd where dd.company_id = co.id)
on conflict (id) do nothing;
