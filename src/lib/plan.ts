import { SupabaseClient } from '@supabase/supabase-js';

export type Plan = 'free' | 'paid';

export const FREE_TIER_LIMITS = {
  maxActiveJobs: 3,
  maxResumeProfiles: 1,
  coverLetters: false,
} as const;

export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<Plan> {
  const { data } = await supabase.from('profiles').select('plan').eq('user_id', userId).maybeSingle();
  return (data?.plan as Plan) ?? 'free';
}

export async function isPaidUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return (await getUserPlan(supabase, userId)) === 'paid';
}
