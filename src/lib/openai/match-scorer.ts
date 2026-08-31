import { MatchItem } from '@/types/match';
import { JobRequirement } from '@/types/job';

// Deterministic weighted scoring — NOT AI-generated
const WEIGHTS = {
  hard_skill: 0.35,
  responsibility: 0.25,
  experience: 0.15,
  education: 0.10,
  certification: 0.05,
  semantic: 0.05,
  ats: 0.05,
};

// Status scores
const STATUS_SCORES = {
  matched: 1.0,
  partial: 0.5,
  no_evidence: 0.0,
};

// Confidence multipliers
const CONFIDENCE_MULTIPLIERS = {
  high: 1.0,
  medium: 0.85,
  low: 0.7,
};

// Importance weights for averaging within category
const IMPORTANCE_WEIGHTS = {
  critical: 2.0,
  high: 1.5,
  medium: 1.0,
  low: 0.5,
};

interface ScoredItem {
  item: MatchItem;
  requirement: JobRequirement;
}

export function calculateMatchScore(scoredItems: ScoredItem[], atsScore?: number): {
  overall: number;
  skill_score: number;
  responsibility_score: number;
  experience_score: number;
  education_score: number;
  semantic_score: number;
  ats_score: number;
  breakdown: Record<string, number>;
} {
  const categoryItems: Record<string, ScoredItem[]> = {
    hard_skill: [],
    soft_skill: [],
    responsibility: [],
    experience: [],
    education: [],
    certification: [],
    technology: [],
  };

  // Group items by category
  for (const si of scoredItems) {
    const cat = si.requirement.category;
    if (categoryItems[cat]) {
      categoryItems[cat].push(si);
    }
  }

  function categoryScore(items: ScoredItem[]): number {
    if (items.length === 0) return 0.75; // Neutral if no requirements in category

    let weightedSum = 0;
    let totalWeight = 0;

    for (const { item, requirement } of items) {
      const importanceWeight = IMPORTANCE_WEIGHTS[requirement.importance] ?? 1.0;
      const statusScore = STATUS_SCORES[item.status] ?? 0;
      const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[item.confidence] ?? 1.0;

      weightedSum += statusScore * confidenceMultiplier * importanceWeight;
      totalWeight += importanceWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.75;
  }

  // Hard skills: combine hard_skill + technology
  const hardSkillItems = [...categoryItems.hard_skill, ...categoryItems.technology];
  const skill_score = Math.round(categoryScore(hardSkillItems) * 100);
  const responsibility_score = Math.round(categoryScore(categoryItems.responsibility) * 100);
  const experience_score = Math.round(categoryScore(categoryItems.experience) * 100);
  const education_score = Math.round(
    (categoryScore(categoryItems.education) * 0.7 +
      categoryScore(categoryItems.certification) * 0.3) * 100
  );

  // Semantic score: average of soft_skill matches (proxy for semantic alignment)
  const semantic_score = Math.round(categoryScore(categoryItems.soft_skill) * 100);

  // ATS score is calculated separately by the ATS checker and passed in
  const ats_score = atsScore ?? 85;

  const overall = Math.round(
    skill_score * WEIGHTS.hard_skill +
    responsibility_score * WEIGHTS.responsibility +
    experience_score * WEIGHTS.experience +
    education_score * WEIGHTS.education +
    semantic_score * WEIGHTS.semantic +
    ats_score * WEIGHTS.ats
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    skill_score: Math.min(100, Math.max(0, skill_score)),
    responsibility_score: Math.min(100, Math.max(0, responsibility_score)),
    experience_score: Math.min(100, Math.max(0, experience_score)),
    education_score: Math.min(100, Math.max(0, education_score)),
    semantic_score: Math.min(100, Math.max(0, semantic_score)),
    ats_score,
    breakdown: {
      'Hard Skills (35%)': skill_score,
      'Responsibilities (25%)': responsibility_score,
      'Experience (15%)': experience_score,
      'Education & Certs (10%)': education_score,
      'Semantic Fit (5%)': semantic_score,
      'ATS Quality (5%)': ats_score,
    },
  };
}

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent Match', color: 'emerald' };
  if (score >= 70) return { label: 'Strong Match', color: 'green' };
  if (score >= 55) return { label: 'Good Match', color: 'yellow' };
  if (score >= 40) return { label: 'Partial Match', color: 'orange' };
  return { label: 'Weak Match', color: 'red' };
}
