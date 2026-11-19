// Types partagés du domaine CRM. Alignés sur le schéma supabase/migrations/.

import type { LeadTier, ScoreBreakdown } from "@/lib/scoring";

export type { LeadTier, ScoreBreakdown };

export type LifecycleStatus = "nouveau" | "qualifie" | "en_cours" | "client" | "rejete";
export type EnrichmentStatus = "a_enrichir" | "en_cours" | "enrichi" | "echec";
export type DealStage =
  | "to_contact"
  | "outreach_sent"
  | "demo_call"
  | "proposal_sent"
  | "closed_won"
  | "closed_lost";
export type TaskType = "call" | "email" | "linkedin" | "follow_up" | "demo" | "other";
export type TaskPriority = "basse" | "normale" | "haute";
export type TaskStatus = "todo" | "done";
export type BatchSource = "google_maps" | "custom";

/** Résultat de la vérification d'e-mail renvoyé par LeadGenEngine. */
export type EmailVerificationStatus = "valid" | "catch_all" | "invalid" | "unknown";

/** Benchmark du secteur local (`companies.local_competitor_benchmark`).
 *  Forme tolérante : LeadGenEngine peut n'envoyer que les moyennes. */
export interface CompetitorBenchmark {
  avg_rating?: number | null;
  avg_reviews?: number | null;
  top_3?: { name?: string | null; rating?: number | null; reviews?: number | null }[] | null;
}

/** Horaires d'ouverture Google (`companies.opening_hours`), forme libre :
 *  un libellé de jour -> une plage horaire déjà formatée. */
export type OpeningHours = Record<string, string>;

export interface ScrapeBatch {
  id: string;
  name: string;
  source: BatchSource;
  city: string | null;
  category: string | null;
  rows_count: number;
  imported_at: string;
}

export interface Company {
  id: string;
  name: string;
  google_place_id: string | null;
  gbp_url: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  lead_score: number;
  lead_tier: LeadTier;
  score_breakdown: ScoreBreakdown | null;
  lifecycle_status: LifecycleStatus;
  owner_id: string | null;
  batch_id: string | null;
  notes: string | null;
  created_at: string;

  // --- Champs LeadGenEngine (0004) : toujours optionnels, les fiches de
  //     seed et les imports CSV antérieurs les laissent à null. ---
  // Identité & présence locale
  department: string | null;
  lat: number | null;
  lng: number | null;
  is_claimed: boolean | null;
  opening_hours: OpeningHours | null;
  siren: string | null;
  siret: string | null;
  multi_location_count: number | null;
  // Audit des avis & signaux de douleur
  reviews_last_90_days: number | null;
  last_review_date: string | null;
  negative_reviews_count_6m: number | null;
  owner_response_rate: number | null;
  last_negative_review_text: string | null;
  last_negative_review_date: string | null;
  reviews_needed_for_next_tier: number | null;
  local_competitor_benchmark: CompetitorBenchmark | null;
  // Scoring & outreach IA
  score_breakdown_text: string | null;
  recommended_angle: string | null;
  call_script_hook: string | null;
  ai_icebreaker: string | null;
  // Traçabilité
  source: string | null;
  scraped_at: string | null;

  // Jointures optionnelles
  scrape_batches?: { name: string } | null;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_decision_maker: boolean;
  enrichment_status: EnrichmentStatus;
  last_negative_review: string | null;
  ai_icebreaker: string | null;
  enriched_at: string | null;
  created_at: string;

  // --- Champs LeadGenEngine (0004) ---
  email_verification_status: EmailVerificationStatus | null;
  direct_phone: string | null;
}

export interface Deal {
  id: string;
  company_id: string;
  title: string;
  stage: DealStage;
  mrr: number | null;
  amount: number | null;
  owner_id: string | null;
  primary_contact_id: string | null;
  expected_close_date: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  company_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
}

/** Contact tel que servi aux vues : la fiche entreprise est jointe pour que
 *  le filtrage unifié (ville, tier, score…) puisse cascader. */
export interface ContactWithCompany extends Contact {
  companies: Company | null;
}

/** Opportunité telle que servie au Kanban : entreprise + contact rattaché. */
export interface DealWithRelations extends Deal {
  companies: Company | null;
  contacts: Contact | null;
}

/** Tâche servie aux vues : entreprise et contact joints pour ouvrir le
 *  tiroir de contexte en un clic et faire cascader le filtrage unifié. */
export interface TaskWithRelations extends Task {
  companies: Company | null;
  contacts: Contact | null;
}

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  en_cours: "En cours",
  client: "Client",
  rejete: "Rejeté",
};

/** Colonnes du Kanban, dans l'ordre du parcours commercial. */
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  to_contact: "Nouveau lead",
  outreach_sent: "Contacté",
  demo_call: "Démo / Audit programmé",
  proposal_sent: "Offre envoyée",
  closed_won: "Gagné",
  closed_lost: "Perdu",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "to_contact",
  "outreach_sent",
  "demo_call",
  "proposal_sent",
  "closed_won",
  "closed_lost",
];

/** Libellés FR du statut de vérification d'e-mail.
 *  `catch_all` = le domaine accepte tout, l'adresse n'est pas confirmée. */
export const EMAIL_VERIFICATION_LABELS: Record<EmailVerificationStatus, string> = {
  valid: "E-mail vérifié",
  catch_all: "Domaine générique",
  invalid: "E-mail invalide",
  unknown: "Non vérifié",
};

export const ENRICHMENT_LABELS: Record<EnrichmentStatus, string> = {
  a_enrichir: "À enrichir",
  en_cours: "En cours",
  enrichi: "Enrichi",
  echec: "Introuvable",
};

/** Abonnement mensuel pré-rempli quand on envoie une entreprise dans le
 *  pipeline. Modifiable carte par carte — ajustez cette valeur au tarif réel. */
export const DEFAULT_MRR = 149;

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Appel",
  email: "Email",
  linkedin: "LinkedIn",
  follow_up: "Relance",
  demo: "Audit / Démo",
  other: "Autre",
};

export const TASK_TYPE_ORDER: TaskType[] = [
  "call",
  "email",
  "linkedin",
  "follow_up",
  "demo",
  "other",
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  haute: "Haute",
  normale: "Normale",
  basse: "Basse",
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = ["haute", "normale", "basse"];

export const TIER_LABELS: Record<LeadTier, string> = {
  A: "A — Chaud",
  B: "B — Tiède",
  C: "C — Froid",
  D: "D — Disqualifié",
};

/** Nom affichable d'un contact (tolère les champs vides). */
export function contactName(c: {
  first_name: string | null;
  last_name: string | null;
}): string {
  const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return n || "Contact sans nom";
}
