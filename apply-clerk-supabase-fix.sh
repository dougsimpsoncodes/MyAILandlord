#!/usr/bin/env bash
set -euo pipefail

mkdir -p supabase/sql src/lib src/hooks src/services/supabase src/clients scripts

cat > supabase/sql/999_apply_auth_and_properties_fix.sql << 'SQL'
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.clerk_id_to_uuid(clerk_id text)
returns uuid language sql immutable as $
  select uuid_generate_v5(uuid_ns_url(), coalesce(clerk_id,''));
$;

create or replace function public.auth_uid_compat()
returns uuid language plpgsql stable as $
declare sub text;
begin
  select auth.jwt()->>'sub' into sub;
  if sub is null or sub = '' then return null; end if;
  if sub ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' then
    return sub::uuid;
  else
    return public.clerk_id_to_uuid(sub);
  end if;
end $;

alter table public.properties alter column landlord_id drop not null;

alter table public.properties alter column user_id set default public.auth_uid_compat();
update public.properties set user_id = public.auth_uid_compat() where user_id is null;
alter table public.properties alter column user_id set not null;

drop policy if exists properties_select_own on public.properties;
drop policy if exists properties_insert_own on public.properties;
drop policy if exists properties_update_own on public.properties;
drop policy if exists properties_delete_own on public.properties;

create policy properties_select_own on public.properties
  for select using (user_id = (select public.auth_uid_compat()));
create policy properties_insert_own on public.properties
  for insert with check (user_id = (select public.auth_uid_compat()));
create policy properties_update_own on public.properties
  for update using (user_id = (select public.auth_uid_compat()))
  with check (user_id = (select public.auth_uid_compat()));
create policy properties_delete_own on public.properties
  for delete using (user_id = (select public.auth_uid_compat()));

create or replace function public.properties_owner_fill()
returns trigger language plpgsql as $
begin
  if new.user_id is null then
    new.user_id := public.auth_uid_compat();
  end if;
  if new.landlord_id is null then
    select p.id into new.landlord_id
    from public.profiles p
    where p.clerk_user_id = (select auth.jwt()->>'sub')
    limit 1;
  end if;
  return new;
end $;

drop trigger if exists trg_properties_owner_fill on public.properties;
create trigger trg_properties_owner_fill
before insert or update on public.properties
for each row execute function public.properties_owner_fill();
SQL

cat > src/lib/supabaseClient.ts << 'TS'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
declare global { var __sb: SupabaseClient | undefined }
const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
const key = 'myailandlord-auth'
export const supabase: SupabaseClient = globalThis.__sb ?? createClient(url, anon, { auth: { storageKey: key, autoRefreshToken: true, persistSession: true }})
if (!globalThis.__sb) globalThis.__sb = supabase
TS

cat > src/lib/rest.ts << 'TS'
const base = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
async function getClerkToken() {
  const w:any = typeof window !== 'undefined' ? window : {}
  return await w?.Clerk?.session?.getToken?.() ?? null
}
async function authHeaders(retries = 6, delayMs = 200): Promise<HeadersInit> {
  for (let i=0;i<retries;i++) {
    const t = await getClerkToken()
    if (t) return { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    await new Promise(r=>setTimeout(r, delayMs))
  }
  throw new Error('AUTH_NOT_READY')
}
export async function restGet(path: string, qs: Record<string,string>) {
  const h = await authHeaders()
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { headers: h })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restInsert(path: string, body: unknown) {
  const h = await authHeaders()
  const r = await fetch(`${base}/rest/v1/${path}`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restPatch(path: string, qs: Record<string,string>, body: unknown) {
  const h = await authHeaders()
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
TS

cat > src/hooks/useSupabaseWithAuth.ts << 'TS'
import { useAuth } from '@clerk/clerk-expo'
import { supabase } from '../lib/supabaseClient'
export function useSupabaseWithAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const getAccessToken = async () => {
    if (!isLoaded || !isSignedIn) return null
    return await getToken()
  }
  return { supabase, getAccessToken, isLoaded, isSignedIn }
}
TS

cat > src/hooks/useProfileSync.ts << 'TS'
import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { upsertProfile, getProfileByClerkId } from '../clients/ClerkSupabaseClient'
export function useProfileSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isLoaded || !isSignedIn || !user) return
      const t = await getToken()
      if (!t) return
      const clerkId = user.id
      const email = user.primaryEmailAddress?.emailAddress || ''
      const name = user.fullName || user.username || ''
      const avatar_url = user.imageUrl || ''
      const ex = await getProfileByClerkId(clerkId)
      await upsertProfile({ id: ex?.id || '', clerk_user_id: clerkId, email, name, avatar_url })
      if (!cancelled) setReady(true)
    }
    run()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user])
  return { ready }
}
TS

cat > src/services/supabase/config.ts << 'TS'
export { supabase } from '../../lib/supabaseClient'
TS

cat > src/clients/ClerkSupabaseClient.ts << 'TS'
import { restGet, restInsert, restPatch } from '../lib/rest'
type Profile = { id: string; clerk_user_id: string; email?: string; name?: string; avatar_url?: string }
export async function getProfileByClerkId(clerkId: string): Promise<Profile | null> {
  const rows = await restGet('profiles_api', { select: '*', clerk_user_id: `eq.${clerkId}` })
  return Array.isArray(rows) && rows.length ? rows[0] : null
}
export async function upsertProfile(p: Profile): Promise<Profile> {
  const existing = await getProfileByClerkId(p.clerk_user_id)
  if (!existing) {
    const rows = await restInsert('profiles_api', p)
    return rows[0]
  }
  const rows = await restPatch('profiles_api', { id: `eq.${existing.id}` }, p)
  return rows[0]
}
type PropertyInsert = { name: string; address_jsonb: any; property_type: string; unit?: string; bedrooms?: number; bathrooms?: number }
export async function insertProperty(payload: PropertyInsert) {
  const rows = await restInsert('properties', payload)
  return rows[0]
}
TS

cat > scripts/codemods.js << 'NODE'
const fs=require('fs');const path=require('path');
const exts=new Set(['.ts','.tsx','.js','.jsx']);
const root=path.resolve(process.cwd(),'src');
let files=[];
(function walk(d){if(!fs.existsSync(d))return;for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk(p);else if(exts.has(path.extname(p)))files.push(p)}})(root);
let changed=0,platformImports=0,removedShadows=0,tokenRepls=0,profilesApi=0,pointerFix=0,driverFix=0,mediaFix=0;
for(const file of files){
  let src=fs.readFileSync(file,'utf8');let orig=src;
  src=src.replace(/getToken\s*\(\s*\{\s*template\s*:\s*['"][^'"]+['"]\s*\}\s*\)/g,()=>{tokenRepls++;return'getToken()'});
  src=src.replace(/\/rest\/v1\/profiles(?!_api)/g,()=>{profilesApi++;return'/rest/v1/profiles_api'});
  src=src.replace(/props\.pointerEvents/g,()=>{pointerFix++;return'style.pointerEvents'});
  if(/useNativeDriver\s*:\s*true/.test(src)){src=src.replace(/useNativeDriver\s*:\s*true/g,()=>{driverFix++;return'useNativeDriver: Platform.OS!=="web"'});if(!/from\s+['"]react-native['"]/.test(src)||!/Platform/.test(src)){src=`import { Platform } from "react-native";\n`+src;platformImports++;}}
  if(/shadow(Color|Opacity|Radius|Offset)/.test(src)){
    src=src.replace(/\bshadowColor\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowOpacity\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowRadius\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowOffset\s*:\s*\{[^}]*\}\s*,?/g,'');
    removedShadows++;
  }
  src=src.replace(/ImagePicker\.MediaTypeOptions/g,()=>{mediaFix++;return'ImagePicker.MediaType'});
  if(src!==orig){fs.writeFileSync(file,src,'utf8');changed++;}
}
const grepCreate=(dir)=>{let hits=[];(function walk2(d){if(!fs.existsSync(d))return;for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk2(p);else if(exts.has(path.extname(p))){const t=fs.readFileSync(p,'utf8');if(/createClient\s*\(/.test(t)&&!p.endsWith(path.join('lib','supabaseClient.ts')))hits.push(p)}}})(dir);return hits}
const dups=grepCreate(root);
if(dups.length){process.stderr.write('DUPLICATE_CREATECLIENT:'+JSON.stringify(dups)+'\n');process.exitCode=3;}
process.stdout.write(JSON.stringify({changed,platformImports,removedShadows,tokenRepls,profilesApi,pointerFix,driverFix,mediaFix})+'\n');
NODE

node scripts/codemods.js || true

echo "OK"