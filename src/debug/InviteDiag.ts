/**
 * Invite Flow Diagnostic Module
 *
 * Usage in Metro console:
 *   const InviteDiag = require('./src/debug/InviteDiag');
 *   await InviteDiag.run();
 */

import { PendingInviteService } from '../services/storage/PendingInviteService';
import { supabase } from '../lib/supabaseClient';
import * as SecureStore from 'expo-secure-store';

const DIVIDER = '='.repeat(80);
const SUBDIV = '-'.repeat(80);

export const InviteDiag = {
  async run() {
    console.log(DIVIDER);
    console.log('🔍 INVITE FLOW DIAGNOSTIC');
    console.log(DIVIDER);

    const results: any = {
      secureStore: null,
      pendingInvite: null,
      authState: null,
      profile: null,
      diagnosis: null,
    };

    // 1. Check SecureStore
    console.log('\n📦 1. SECURE STORE CHECK');
    console.log(SUBDIV);
    try {
      const rawValue = await SecureStore.getItemAsync('pending_invite');
      if (rawValue) {
        const parsed = JSON.parse(rawValue);
        results.secureStore = {
          exists: true,
          type: parsed.type,
          tokenPreview: parsed.value?.substring(0, 4) + '...' + parsed.value?.substring(parsed.value.length - 4),
          metadata: parsed.metadata,
        };
        console.log('✅ Pending invite found in SecureStore');
        console.log('   Type:', parsed.type);
        console.log('   Token:', results.secureStore.tokenPreview);
        console.log('   Metadata:', parsed.metadata);
      } else {
        results.secureStore = { exists: false };
        console.log('❌ NO pending invite in SecureStore');
      }
    } catch (e) {
      console.error('❌ Error reading SecureStore:', e);
      results.secureStore = { error: String(e) };
    }

    // 2. Check PendingInviteService
    console.log('\n🔧 2. PENDING INVITE SERVICE CHECK');
    console.log(SUBDIV);
    try {
      const pendingInvite = await PendingInviteService.getPendingInvite();
      if (pendingInvite) {
        results.pendingInvite = {
          exists: true,
          type: pendingInvite.type,
          tokenPreview: pendingInvite.value.substring(0, 4) + '...' + pendingInvite.value.substring(pendingInvite.value.length - 4),
          metadata: pendingInvite.metadata,
        };
        console.log('✅ PendingInviteService can read invite');
        console.log('   Type:', pendingInvite.type);
        console.log('   Token:', results.pendingInvite.tokenPreview);
      } else {
        results.pendingInvite = { exists: false };
        console.log('❌ PendingInviteService returns null');
      }
    } catch (e) {
      console.error('❌ Error via PendingInviteService:', e);
      results.pendingInvite = { error: String(e) };
    }

    // 3. Check auth state
    console.log('\n🔐 3. AUTH STATE CHECK');
    console.log(SUBDIV);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.authState = {
        authenticated: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        hasMetadata: !!session?.user?.user_metadata,
      };
      console.log('Auth status:', session ? '✅ Authenticated' : '❌ Not authenticated');
      if (session) {
        console.log('   User ID:', session.user.id);
        console.log('   Email:', session.user.email);
      }
    } catch (e) {
      console.error('❌ Error getting auth state:', e);
      results.authState = { error: String(e) };
    }

    // 4. Check profile
    console.log('\n👤 4. PROFILE CHECK');
    console.log(SUBDIV);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('❌ Profile query error:', error.message);
          results.profile = { error: error.message };
        } else {
          results.profile = {
            exists: !!profile,
            role: profile?.role,
            onboardingCompleted: profile?.onboarding_completed,
            name: profile?.name,
          };
          console.log('Profile:', profile ? '✅ Exists' : '❌ Missing');
          if (profile) {
            console.log('   Role:', profile.role || 'NULL');
            console.log('   Onboarding:', profile.onboarding_completed ? 'Complete' : 'Incomplete');
            console.log('   Name:', profile.name);
          }
        }
      } else {
        results.profile = { exists: false, reason: 'No authenticated user' };
        console.log('⚠️  Cannot check profile - no authenticated user');
      }
    } catch (e) {
      console.error('❌ Error checking profile:', e);
      results.profile = { error: String(e) };
    }

    // 5. Diagnosis
    console.log('\n🩺 5. DIAGNOSIS');
    console.log(SUBDIV);

    if (!results.secureStore?.exists) {
      results.diagnosis = 'FAILURE AT STEP 1: Deep link did not save pending invite to SecureStore';
      console.log('❌ FAILURE POINT: Step 1 - AppNavigator deep link handling');
      console.log('   Location: src/AppNavigator.tsx:55-68');
      console.log('   Issue: Invite link was triggered but not saved to SecureStore');
      console.log('   Action: Check deep link parsing and PendingInviteService.savePendingInvite()');
    } else if (!results.authState?.authenticated) {
      results.diagnosis = 'USER NOT AUTHENTICATED: Expected to be signed in at this point';
      console.log('⚠️  User is not authenticated');
      console.log('   This diagnostic should be run AFTER completing signup');
    } else if (results.secureStore?.exists && results.authState?.authenticated) {
      results.diagnosis = 'FAILURE AT STEP 3: Auth guard did not detect pending invite and set redirect';
      console.log('❌ FAILURE POINT: Step 3 - Auth context invite detection');
      console.log('   Location: src/context/SupabaseAuthContext.tsx:104-144');
      console.log('   Issue: Pending invite exists, user authenticated, but redirect not set');
      console.log('   Data:');
      console.log('     - Pending invite:', results.secureStore.tokenPreview);
      console.log('     - User ID:', results.authState.userId);
      console.log('   Action: Check useEffect dependencies and timing in SupabaseAuthContext');
    }

    console.log('\n' + DIVIDER);
    console.log('📊 SUMMARY');
    console.log(SUBDIV);
    console.log('SecureStore:', results.secureStore?.exists ? '✅' : '❌');
    console.log('Service:', results.pendingInvite?.exists ? '✅' : '❌');
    console.log('Auth:', results.authState?.authenticated ? '✅' : '❌');
    console.log('Profile:', results.profile?.exists ? '✅' : '❌');
    console.log('');
    console.log('Diagnosis:', results.diagnosis);
    console.log(DIVIDER);

    return results;
  },
};

// Default export for require()
export default InviteDiag;
