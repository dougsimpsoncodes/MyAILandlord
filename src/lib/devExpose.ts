/*
  Dev-only global diagnostics for invite flow. Loaded only in __DEV__.
  Usage in Metro console:
    await InviteDiag.run()
*/
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PendingInviteService } from '../services/storage/PendingInviteService';
import { supabase } from '../lib/supabaseClient';
import { log } from './log';

const PENDING_INVITE_KEY = '@MyAILandlord:pendingPropertyInvite';

async function dumpRawStorage() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function getProfile(userId?: string) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return { error } as const;
  return data;
}

async function validateInvite(token: string) {
  try {
    const { data, error } = await supabase.rpc('validate_invite', { p_token: token });
    if (error) return { error };
    return data?.[0] ?? null;
  } catch (e) {
    return { error: e };
  }
}

async function run() {
  const line = '='.repeat(80);
  // eslint-disable-next-line no-console
  console.log(line); console.log('INVITE FLOW DIAGNOSTIC'); console.log(line);

  // 1) Raw storage
  // eslint-disable-next-line no-console
  console.log('\n1. RAW STORAGE (@MyAILandlord:pendingPropertyInvite)');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  const raw = await dumpRawStorage();
  // eslint-disable-next-line no-console
  console.log('Raw value:', raw);

  // 2) PendingInviteService
  // eslint-disable-next-line no-console
  console.log('\n2. PendingInviteService.getPendingInvite()');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  const svc = await PendingInviteService.getPendingInvite();
  // eslint-disable-next-line no-console
  console.log('Service value:', svc);

  // 3) Auth state
  // eslint-disable-next-line no-console
  console.log('\n3. Auth state');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  const session = await getSession();
  const userId = session?.user?.id;
  // eslint-disable-next-line no-console
  console.log('Has session:', !!session, 'User ID:', userId, 'Email:', session?.user?.email);

  // 4) Profile
  // eslint-disable-next-line no-console
  console.log('\n4. Profile');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  const profile = await getProfile(userId);
  // eslint-disable-next-line no-console
  console.log('Profile:', profile && 'error' in (profile as any) ? (profile as any) : profile);

  // 5) Auth guard snapshot (exposed by provider in dev)
  // eslint-disable-next-line no-console
  console.log('\n5. Auth guard snapshot');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  // @ts-ignore
  const guard = (globalThis as any).__AuthDebug || null;
  // eslint-disable-next-line no-console
  console.log('Guard:', guard);

  // 6) Validate token if present
  // eslint-disable-next-line no-console
  console.log('\n6. validate_invite');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(80));
  const token = svc?.value;
  if (token) {
    const res = await validateInvite(token);
    // eslint-disable-next-line no-console
    console.log('validate_invite:', res);
  } else {
    // eslint-disable-next-line no-console
    console.log('No token present to validate');
  }

  // Timeline guide
  // eslint-disable-next-line no-console
  console.log('\n' + line);
  // eslint-disable-next-line no-console
  console.log('Expected flow:');
  // eslint-disable-next-line no-console
  console.log('1) Deep link saves token → storage ok');
  // eslint-disable-next-line no-console
  console.log('2) Signup completes → session ok');
  // eslint-disable-next-line no-console
  console.log('3) Auth guard sees token → guard.redirect set');
  // eslint-disable-next-line no-console
  console.log('4) Navigator guard routes to accept screen');
  // eslint-disable-next-line no-console
  console.log(line);
}

// @ts-ignore
(globalThis as any).InviteDiag = {
  run,
  dumpRawStorage,
  getPendingInvite: () => PendingInviteService.getPendingInvite(),
  getSession,
  getProfile,
  validateInvite,
};

// Dev banner (only shows in development)
log.debug('[devExpose] InviteDiag attached to globalThis.InviteDiag');

