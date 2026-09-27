import { TruthGuardFlag } from '@/types/match';

export type TruthGuardStatus = 'supported' | 'needs_review' | 'unsupported';

export interface TruthGuardResult {
  flags: TruthGuardFlag[];
  passed: boolean;
}

/**
 * Classifies an existing Truth Guard result into the three-outcome gate used to
 * decide whether AI-generated resume content may be saved. Reuses runTruthGuard's
 * existing output as-is (no prompt/schema change): no flags -> supported; flagged
 * but the model still judged it overall accurate -> needs_review; flagged and
 * judged inaccurate -> unsupported.
 */
export function classifyTruthGuardResult(result: TruthGuardResult): TruthGuardStatus {
  if (result.flags.length === 0) return 'supported';
  return result.passed ? 'needs_review' : 'unsupported';
}
