// Scoring « potentiel d'amélioration » — réplique TypeScript de tools/compute_score.py.
// Les deux lisent tools/scoring_config.json (source de vérité unique).
// Utilisé côté serveur par l'API d'import (app/api/import/route.ts).

import scoringConfig from "@/tools/scoring_config.json";

export type LeadTier = "A" | "B" | "C" | "D";

export interface ScoreInput {
  rating: number | null;
  reviews_count: number | null;
  website: string | null;
  phone: string | null;
  category: string | null;
}

export interface ScoreComponent {
  factor: number;
  points: number;
  weight: number;
}

export interface ScoreBreakdown {
  rating: ScoreComponent;
  reviews: ScoreComponent;
  web_presence: ScoreComponent;
  category: ScoreComponent;
  disqualified: boolean;
}

export interface ScoreResult {
  lead_score: number;
  lead_tier: LeadTier;
  score_breakdown: ScoreBreakdown;
}

const cfg = scoringConfig as any;

function normalize(text: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function round1(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Arrondi "half to even" pour coller à Python round() (évite toute dérive de tier).
function roundHalfEven(n: number): number {
  const floor = Math.floor(n);
  const diff = n - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

function ratingFactor(rating: number | null): number {
  const r = cfg.rating;
  if (rating === null || rating <= 0) return r.null_factor;
  if (rating >= r.excellent_threshold) return r.excellent_factor;
  if (rating >= r.high_threshold) return r.high_factor;
  if (rating >= r.sweet_spot_threshold) return r.sweet_spot_factor;
  if (rating >= r.low_threshold) return r.low_factor;
  return r.very_low_factor;
}

function reviewsFactor(reviews: number | null): number {
  const rv = cfg.reviews;
  if (reviews === null || reviews <= 0) return rv.zero_factor;
  if (reviews < rv.few_threshold) return rv.few_factor;
  if (reviews < rv.medium_threshold) return rv.medium_factor;
  return rv.many_factor;
}

function webFactor(hasWebsite: boolean, hasPhone: boolean): number {
  const w = cfg.web_presence;
  if (hasWebsite && hasPhone) return w.both_factor;
  if (hasWebsite || hasPhone) return w.one_factor;
  return w.none_factor;
}

function categoryFactor(category: string | null): number {
  const c = cfg.category;
  const norm = normalize(category);
  if (norm && c.priority_keywords.some((kw: string) => norm.includes(kw))) {
    return c.priority_factor;
  }
  return c.other_factor;
}

function tierFor(score: number): LeadTier {
  const t = cfg.tiers;
  if (score >= t.A) return "A";
  if (score >= t.B) return "B";
  if (score >= t.C) return "C";
  return "D";
}

export function computeScore(input: ScoreInput): ScoreResult {
  const w = cfg.weights;
  const hasWebsite = Boolean((input.website ?? "").trim());
  const hasPhone = Boolean((input.phone ?? "").trim());

  const rF = ratingFactor(input.rating);
  const rvF = reviewsFactor(input.reviews_count);
  const wF = webFactor(hasWebsite, hasPhone);
  const cF = categoryFactor(input.category);

  const ratingPts = w.rating * rF;
  const reviewsPts = w.reviews * rvF;
  const webPts = w.web_presence * wF;
  const catPts = w.category * cF;

  let raw = ratingPts + reviewsPts + webPts + catPts;

  let disqualified = false;
  const wp = cfg.web_presence;
  if (wp.disqualify_if_none && !hasWebsite && !hasPhone) {
    disqualified = true;
    raw = Math.min(raw, wp.disqualified_score_cap);
  }

  const score = Math.max(0, Math.min(100, roundHalfEven(raw)));
  const tier = tierFor(score);

  return {
    lead_score: score,
    lead_tier: tier,
    score_breakdown: {
      rating: { factor: round1(rF), points: round1(ratingPts), weight: w.rating },
      reviews: { factor: round1(rvF), points: round1(reviewsPts), weight: w.reviews },
      web_presence: { factor: round1(wF), points: round1(webPts), weight: w.web_presence },
      category: { factor: round1(cF), points: round1(catPts), weight: w.category },
      disqualified,
    },
  };
}
