import { describe, expect, it } from 'vitest';
import { classifyTruthGuardResult } from '../truth-guard-gate';

describe('classifyTruthGuardResult', () => {
  it('classifies no flags as supported', () => {
    expect(classifyTruthGuardResult({ flags: [], passed: true })).toBe('supported');
    // Even if the model somehow set passed=false with no flags, absence of flags wins.
    expect(classifyTruthGuardResult({ flags: [], passed: false })).toBe('supported');
  });

  it('classifies flags + passed=true as needs_review', () => {
    const result = { flags: [{ text: 'x', reason: 'y', source: 'ai_generated' as const }], passed: true };
    expect(classifyTruthGuardResult(result)).toBe('needs_review');
  });

  it('classifies flags + passed=false as unsupported', () => {
    const result = { flags: [{ text: 'x', reason: 'y', source: 'not_in_resume' as const }], passed: false };
    expect(classifyTruthGuardResult(result)).toBe('unsupported');
  });

  it('multiple flags do not change the passed=true/false mapping', () => {
    const flags = [
      { text: 'a', reason: 'r1', source: 'ai_generated' as const },
      { text: 'b', reason: 'r2', source: 'not_in_resume' as const },
    ];
    expect(classifyTruthGuardResult({ flags, passed: true })).toBe('needs_review');
    expect(classifyTruthGuardResult({ flags, passed: false })).toBe('unsupported');
  });
});
