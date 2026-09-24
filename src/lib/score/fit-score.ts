import type { DimensionConfig, ScoreConfig } from './config';
import { requirementResultsSchema } from './schema';
import type {
  DimensionScore,
  FitLabel,
  FitScore,
  RequirementContribution,
  RequirementResult,
} from './types';

// The fit score, PRD section 10C. A pure function of validated requirement
// results and a versioned configuration: same inputs, same output, on any machine.

// Returns null for To verify, which is excluded from the score.
export function creditFor(result: RequirementResult, config: ScoreConfig): number | null {
  switch (result.state) {
    case 'backed_up':
      return result.strength === 'verified' ? config.credits.verified : config.credits.evidenced;
    case 'needs_attention':
      if (result.reason === 'years_short') {
        if (!result.years || result.years.required <= 0) throw new Error('years_short needs a positive required value');
        return Math.min(1, Math.max(0, result.years.actual / result.years.required));
      }
      return config.credits[result.reason];
    case 'unsupported':
      return 0;
    case 'to_verify':
      return null;
  }
}

export function labelFor(score: number, mustHaveUnsupported: boolean, config: ScoreConfig): FitLabel {
  const bandIndex = config.bands.findIndex((b) => score >= b.min);
  const capIndex = config.bands.findIndex((b) => b.label === config.mustHaveCap);
  // Bands run highest first, so a smaller index is a better label.
  const index = mustHaveUnsupported && bandIndex < capIndex ? capIndex : bandIndex;
  return config.bands[index].label;
}

// Round half up. The 1e-9 snap absorbs float noise so 64.4999999999 from an
// exact 64.5 still rounds to 65.
function roundHalfUp(value: number): number {
  return Math.floor(Math.round(value * 1e9) / 1e9 + 0.5);
}

interface Evaluation {
  raw: number | null;
  dimensions: DimensionScore[];
  contributions: RequirementContribution[];
}

function evaluate(scored: RequirementResult[], dimensionOf: Map<string, DimensionConfig>, config: ScoreConfig): Evaluation {
  const byDimension = new Map<DimensionConfig, { weight: number; credit: number; id: string }[]>();
  let evaluatedCount = 0;
  for (const r of scored) {
    const credit = creditFor(r, config);
    if (credit === null) continue;
    evaluatedCount += 1;
    const dim = dimensionOf.get(r.kind)!;
    const list = byDimension.get(dim) ?? [];
    list.push({ weight: config.necessityWeights[r.necessity], credit, id: r.requirement_id });
    byDimension.set(dim, list);
  }

  const active = config.dimensions.filter((d) => byDimension.has(d));
  if (active.length === 0 || evaluatedCount < config.minEvaluated) {
    return { raw: null, dimensions: [], contributions: [] };
  }

  const activeWeight = active.reduce((s, d) => s + d.weight, 0);
  const dimensions: DimensionScore[] = [];
  const contributions: RequirementContribution[] = [];
  let raw = 0;

  for (const d of active) {
    const items = byDimension.get(d)!;
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const dimScore = items.reduce((s, i) => s + i.weight * i.credit, 0) / totalWeight;
    // A dimension the job does not use is simply absent: no neutral fill.
    const effectiveWeight = d.weight / activeWeight;
    raw += 100 * effectiveWeight * dimScore;
    dimensions.push({ id: d.id, name: d.name, baseWeight: d.weight, effectiveWeight, score: dimScore, evaluatedCount: items.length });
    for (const i of items) {
      const share = 100 * effectiveWeight * (i.weight / totalWeight);
      contributions.push({ requirement_id: i.id, dimension: d.id, contribution: share * i.credit, loss: share * (1 - i.credit) });
    }
  }

  contributions.sort((a, b) => (a.requirement_id < b.requirement_id ? -1 : a.requirement_id > b.requirement_id ? 1 : 0));
  return { raw, dimensions, contributions };
}

function topBy(items: RequirementContribution[], key: 'contribution' | 'loss'): RequirementContribution[] {
  return items
    .filter((c) => c[key] > 1e-9)
    .sort((a, b) => b[key] - a[key] || (a.requirement_id < b.requirement_id ? -1 : 1))
    .slice(0, 3);
}

export function computeFitScore(results: readonly RequirementResult[], config: ScoreConfig): FitScore {
  const parsed: RequirementResult[] = requirementResultsSchema.parse(results);

  const dimensionOf = new Map<string, DimensionConfig>();
  for (const d of config.dimensions) for (const k of d.kinds) dimensionOf.set(k, d);

  // Stated requirements of scored kinds only. Inferred items are never scored.
  // Sorting by id makes float summation order, and so the output, independent of input order.
  const scored = parsed
    .filter((r) => r.origin === 'stated' && dimensionOf.has(r.kind))
    .sort((a, b) => (a.requirement_id < b.requirement_id ? -1 : 1));

  const { raw, dimensions, contributions } = evaluate(scored, dimensionOf, config);
  const score = raw === null ? null : roundHalfUp(raw);

  const mustHaveUnsupported = scored.some(
    (r) => r.state === 'unsupported' && r.necessity === 'required' && config.mustHaveKinds.includes(r.kind),
  );

  let range: FitScore['range'] = null;
  const inRange = (r: RequirementResult) => r.state === 'to_verify' && config.rangeReasons.includes(r.reason);
  if (score !== null && scored.some(inRange)) {
    const low = evaluate(
      scored.map((r): RequirementResult => (inRange(r) ? { ...pick(r), state: 'unsupported', reason: 'no_evidence_found' } : r)),
      dimensionOf,
      config,
    ).raw;
    const high = evaluate(
      scored.map((r): RequirementResult =>
        inRange(r) ? { ...pick(r), state: 'backed_up', reason: 'judge_supported', strength: 'verified' } : r,
      ),
      dimensionOf,
      config,
    ).raw;
    if (low !== null && high !== null) {
      const l = roundHalfUp(low);
      const h = roundHalfUp(high);
      if (h - l >= config.rangeThreshold) range = { low: l, high: h };
    }
  }

  return {
    scoreConfigVersion: config.version,
    score,
    label: score === null ? null : labelFor(score, mustHaveUnsupported, config),
    mustHaveUnsupported,
    evaluatedCount: scored.filter((r) => r.state !== 'to_verify').length,
    scoredTotal: scored.length,
    range,
    dimensions,
    contributions,
    topGaps: topBy(contributions, 'loss'),
    topContributors: topBy(contributions, 'contribution'),
  };
}

function pick(r: RequirementResult) {
  return { requirement_id: r.requirement_id, kind: r.kind, necessity: r.necessity, origin: r.origin };
}
