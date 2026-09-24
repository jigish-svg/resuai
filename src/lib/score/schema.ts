import { z } from 'zod';
import type { RequirementResult } from './types';

// Runtime guard for the score's inputs. Objects are strict, so any extra
// field (a quiz result, a click count, a plan flag) is rejected rather than
// silently carried along.

const base = {
  requirement_id: z.string().min(1),
  kind: z.enum([
    'hard_skill',
    'tool',
    'technology',
    'responsibility',
    'domain',
    'experience',
    'seniority',
    'education',
    'certification',
    'soft_skill',
    'language',
    'location',
    'work_authorization',
    'other',
  ]),
  necessity: z.enum(['required', 'preferred', 'nice_to_have', 'unspecified']),
  origin: z.enum(['stated', 'inferred']),
};

const backedUp = z
  .object({
    ...base,
    state: z.literal('backed_up'),
    reason: z.enum([
      'exact_in_role_bullet',
      'exact_in_project',
      'alias_match',
      'cert_present',
      'degree_meets_level',
      'years_meet',
      'judge_supported',
      'user_confirmed',
      'user_declared',
    ]),
    strength: z.enum(['evidenced', 'verified']),
  })
  .strict();

const needsAttention = z
  .object({
    ...base,
    state: z.literal('needs_attention'),
    reason: z.enum(['claimed_not_shown', 'years_short', 'adjacent_concept', 'judge_partial']),
    years: z
      .object({ actual: z.number().finite().min(0), required: z.number().finite().positive() })
      .strict()
      .optional(),
  })
  .strict();

const unsupported = z
  .object({
    ...base,
    state: z.literal('unsupported'),
    reason: z.enum(['no_evidence_found', 'below_required_level', 'expired_credential', 'contradicted_by_data', 'user_confirmed_no']),
  })
  .strict();

const toVerify = z
  .object({
    ...base,
    state: z.literal('to_verify'),
    reason: z.enum([
      'by_design',
      'thin_evidence',
      'ambiguous_requirement',
      'low_confidence_extraction',
      'judge_disagreement',
      'engine_gap',
    ]),
  })
  .strict();

export const requirementResultSchema = z
  .discriminatedUnion('state', [backedUp, needsAttention, unsupported, toVerify])
  .superRefine((r, ctx) => {
    if (r.state === 'needs_attention' && (r.reason === 'years_short') !== (r.years !== undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'years is required for years_short and only for years_short' });
    }
  });

export const requirementResultsSchema = z.array(requirementResultSchema).superRefine((results, ctx) => {
  const seen = new Set<string>();
  for (const r of results) {
    if (seen.has(r.requirement_id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate requirement_id ${r.requirement_id}` });
    }
    seen.add(r.requirement_id);
  }
});

// Compile-time check that the schema and the hand-written types agree.
type Parsed = z.infer<typeof requirementResultSchema>;
const _schemaMatchesType: RequirementResult = {} as Parsed;
const _typeMatchesSchema: Parsed = {} as RequirementResult;
void _schemaMatchesType;
void _typeMatchesSchema;
