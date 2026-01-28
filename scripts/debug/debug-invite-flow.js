/**
 * DEBUG SCRIPT: Invite Flow After Signup
 *
 * This script diagnoses why pending invites aren't being detected after signup.
 *
 * Run in Metro console after reproducing the issue:
 * 1. Delete app
 * 2. Trigger invite link (unauthenticated)
 * 3. Complete signup
 * 4. Run this script in Metro console
 */

(async () => {
  console.log('='.repeat(80));
  console.log('INVITE FLOW DIAGNOSTIC');
  console.log('='.repeat(80));

  try {
    // Import required modules
    const { PendingInviteService } = require('./src/services/storage/PendingInviteService');
    const { supabase } = require('./src/lib/supabaseClient');
    const SecureStore = require('expo-secure-store');

    // 1. Check SecureStore directly
    console.log('\n1. CHECKING SECURE STORE DIRECTLY');
    console.log('-'.repeat(80));
    try {
      const rawValue = await SecureStore.getItemAsync('pending_invite');
      console.log('Raw SecureStore value:', rawValue);
      if (rawValue) {
        const parsed = JSON.parse(rawValue);
        console.log('Parsed value:', parsed);
        console.log('Token preview:', parsed.value?.substring(0, 4) + '...');
      } else {
        console.log('⚠️  NO PENDING INVITE IN SECURE STORE');
      }
    } catch (e) {
      console.error('Error reading SecureStore:', e);
    }

    // 2. Check via PendingInviteService
    console.log('\n2. CHECKING VIA PENDING INVITE SERVICE');
    console.log('-'.repeat(80));
    try {
      const pendingInvite = await PendingInviteService.getPendingInvite();
      console.log('PendingInviteService result:', pendingInvite);
      if (pendingInvite) {
        console.log('Token preview:', pendingInvite.value.substring(0, 4) + '...');
        console.log('Metadata:', pendingInvite.metadata);
      } else {
        console.log('⚠️  NO PENDING INVITE VIA SERVICE');
      }
    } catch (e) {
      console.error('Error via PendingInviteService:', e);
    }

    // 3. Check current auth state
    console.log('\n3. CHECKING AUTH STATE');
    console.log('-'.repeat(80));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Has session:', !!session);
      console.log('User ID:', session?.user?.id);
      console.log('User email:', session?.user?.email);
      console.log('User metadata:', session?.user?.user_metadata);
    } catch (e) {
      console.error('Error getting auth state:', e);
    }

    // 4. Check profile
    console.log('\n4. CHECKING PROFILE');
    console.log('-'.repeat(80));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Profile query error:', error);
        } else {
          console.log('Profile exists:', !!profile);
          console.log('Profile role:', profile?.role);
          console.log('Onboarding completed:', profile?.onboarding_completed);
        }
      }
    } catch (e) {
      console.error('Error checking profile:', e);
    }

    // 5. Timeline reconstruction
    console.log('\n5. TIMELINE RECONSTRUCTION');
    console.log('-'.repeat(80));
    console.log('Expected flow:');
    console.log('  1. Invite link triggered → AppNavigator.tsx:55-68');
    console.log('     → Should save to SecureStore via PendingInviteService');
    console.log('  2. User completes signup → SupabaseAuthContext.tsx:88-98');
    console.log('     → Auth state changes to SIGNED_IN');
    console.log('  3. Auth guard checks pending invite → SupabaseAuthContext.tsx:104-144');
    console.log('     → Should set redirect state');
    console.log('  4. AppNavigator redirect guard → AppNavigator.tsx:107-123');
    console.log('     → Should navigate to PropertyInviteAcceptScreen');
    console.log('');
    console.log('Failure point analysis:');
    console.log('  - If pending invite missing: Step 1 failed (AppNavigator deep link)');
    console.log('  - If pending invite exists but no redirect: Step 3 failed (Auth guard)');
    console.log('  - If redirect exists but wrong screen: Step 4 failed (Navigator guard)');

    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('DIAGNOSTIC ERROR:', error);
  }
})();
