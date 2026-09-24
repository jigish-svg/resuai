import type {
  BackedUpReason,
  Necessity,
  NeedsAttentionReason,
  RequirementKind,
  RequirementResult,
  ToVerifyReason,
  UnsupportedReason,
} from '@/lib/score/types';

let counter = 0;
function nextId() {
  counter += 1;
  return `req-${String(counter).padStart(4, '0')}`;
}

interface Opts {
  id?: string;
  necessity?: Necessity;
  origin?: 'stated' | 'inferred';
}

function base(kind: RequirementKind, opts: Opts) {
  return {
    requirement_id: opts.id ?? nextId(),
    kind,
    necessity: opts.necessity ?? 'required',
    origin: opts.origin ?? 'stated',
  };
}

export function verified(kind: RequirementKind, opts: Opts = {}, reason: BackedUpReason = 'exact_in_role_bullet'): RequirementResult {
  return { ...base(kind, opts), state: 'backed_up', reason, strength: 'verified' };
}

export function evidenced(kind: RequirementKind, opts: Opts = {}, reason: BackedUpReason = 'exact_in_role_bullet'): RequirementResult {
  return { ...base(kind, opts), state: 'backed_up', reason, strength: 'evidenced' };
}

export function attention(
  kind: RequirementKind,
  reason: Exclude<NeedsAttentionReason, 'years_short'>,
  opts: Opts = {},
): RequirementResult {
  return { ...base(kind, opts), state: 'needs_attention', reason };
}

export function yearsShort(actual: number, required: number, opts: Opts = {}): RequirementResult {
  return { ...base('experience', opts), state: 'needs_attention', reason: 'years_short', years: { actual, required } };
}

export function unsupported(kind: RequirementKind, opts: Opts = {}, reason: UnsupportedReason = 'no_evidence_found'): RequirementResult {
  return { ...base(kind, opts), state: 'unsupported', reason };
}

export function toVerify(kind: RequirementKind, reason: ToVerifyReason, opts: Opts = {}): RequirementResult {
  return { ...base(kind, opts), state: 'to_verify', reason };
}

export function times(n: number, make: () => RequirementResult): RequirementResult[] {
  return Array.from({ length: n }, make);
}

// Mixed fixtures used by the property-style tests (monotonic, order, determinism).
export function mixedFixtures(): Record<string, RequirementResult[]> {
  return {
    strong: [
      verified('hard_skill'),
      evidenced('technology'),
      evidenced('tool', { necessity: 'preferred' }),
      evidenced('responsibility', { necessity: 'unspecified' }),
      verified('education'),
      evidenced('soft_skill', { necessity: 'preferred' }),
    ],
    weak: [
      unsupported('hard_skill'),
      unsupported('technology'),
      attention('tool', 'claimed_not_shown'),
      unsupported('responsibility'),
      yearsShort(1, 5),
      unsupported('education', {}, 'below_required_level'),
    ],
    careerSwitch: [
      attention('hard_skill', 'adjacent_concept'),
      attention('hard_skill', 'adjacent_concept', { necessity: 'preferred' }),
      evidenced('responsibility'),
      evidenced('domain', { necessity: 'nice_to_have' }),
      yearsShort(2, 4),
      evidenced('soft_skill'),
      toVerify('location', 'by_design'),
    ],
    nursing: [
      verified('certification', {}, 'cert_present'),
      evidenced('hard_skill', {}, 'exact_in_role_bullet'),
      evidenced('education', {}, 'degree_meets_level'),
      attention('responsibility', 'judge_partial'),
      evidenced('language', { necessity: 'preferred' }),
      toVerify('work_authorization', 'by_design'),
      toVerify('hard_skill', 'thin_evidence'),
    ],
  };
}
