/**
 * Create a test user with paid (premium) access for local development.
 * Run with: node scripts/create-test-user.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxpfhblwlzbvcntjssom.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  process.exit(1);
}

const TEST_EMAIL = 'test@getjobfit.in';
const TEST_PASSWORD = 'TestPremium#2026';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Creating test user...');

  // 1. Create or reuse the user
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find(u => u.email === TEST_EMAIL);

  let userId;

  if (existingUser) {
    console.log('User already exists:', existingUser.id);
    userId = existingUser.id;
    // Reset password just in case
    await supabase.auth.admin.updateUserById(userId, { password: TEST_PASSWORD });
    console.log('Password reset.');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Test Premium User' },
    });
    if (error) { console.error('Failed to create user:', error.message); process.exit(1); }
    userId = data.user.id;
    console.log('User created:', userId);
  }

  // 2. Upsert into user_plans as paid
  const { error: planError } = await supabase
    .from('user_plans')
    .upsert({
      user_id: userId,
      plan: 'paid',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (planError) {
    // Table might be named differently — try 'subscriptions'
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        plan: 'paid',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.warn('Could not set paid plan (table may differ):', planError.message, subError.message);
      console.warn('You may need to manually set paid status in Supabase dashboard.');
    } else {
      console.log('Paid plan set via subscriptions table.');
    }
  } else {
    console.log('Paid plan set via user_plans table.');
  }

  console.log('\n=== TEST CREDENTIALS ===');
  console.log('Email:    ', TEST_EMAIL);
  console.log('Password: ', TEST_PASSWORD);
  console.log('User ID:  ', userId);
  console.log('Access:    Premium (paid)');
  console.log('URL:       http://localhost:3000/login');
  console.log('========================\n');
}

main().catch(console.error);
