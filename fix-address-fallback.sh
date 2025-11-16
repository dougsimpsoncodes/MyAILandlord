#!/usr/bin/env bash
set -euo pipefail

mkdir -p supabase/sql src/lib src/clients

cat > supabase/sql/1002_properties_address_fallback.sql << 'SQL'
create or replace function public.address_text_from_jsonb(j jsonb, unit text default null)
returns text
language sql
immutable
as $f$
  select trim(both ' ' from concat_ws(
    ', ',
    nullif(concat_ws(' ',
      coalesce(j->>'line1',''),
      case when coalesce(unit,'')<>'' and coalesce(j->>'line2','')='' then 'Unit '||unit else '' end
    ),''),
    nullif(j->>'line2',''),
    nullif(concat_ws(', ',
      nullif(j->>'city',''),
      nullif(j->>'state',''),
      nullif(j->>'zipCode','')
    ),'')
  ));
$f$;

alter table public.properties alter column address drop not null;

update public.properties
set address = public.address_text_from_jsonb(address_jsonb, unit)
where address is null and address_jsonb is not null;

create or replace function public.properties_owner_fill()
returns trigger
language plpgsql
as $fn$
begin
  if new.user_id is null then
    new.user_id := public.auth_uid_compat();
  end if;

  if new.landlord_id is null then
    select p.id into new.landlord_id
    from public.profiles p
    where p.clerk_user_id = (auth.jwt()->>'sub')
    limit 1;
  end if;

  if (new.address is null or new.address = '') and new.address_jsonb is not null then
    new.address := public.address_text_from_jsonb(new.address_jsonb, new.unit);
  end if;

  return new;
end
$fn$;
SQL

cat > src/lib/address.ts << 'TS'
export type AddressJson={line1?:string;line2?:string;city?:string;state?:string;zipCode?:string;country?:string}
export function formatAddressFromJson(j:AddressJson={},unit?:string){
  const l1=(j.line1||'').trim()
  const u=(unit||'').trim()
  const l2=(j.line2||'').trim()
  const city=(j.city||'').trim()
  const st=(j.state||'').trim()
  const zip=(j.zipCode||'').trim()
  const p1=[ [l1, u && !l2 ? `Unit ${u}`:'' ].filter(Boolean).join(' ').trim(), l2 ].filter(Boolean)
  const p2=[city,st,zip].filter(Boolean).join(', ')
  return [p1.filter(Boolean).join(', '),p2].filter(Boolean).join(', ').trim()
}
TS

cat > src/clients/ClerkSupabaseClient.ts << 'TS'
import { restGet, restInsert, restPatch } from '../lib/rest'
import { formatAddressFromJson } from '../lib/address'
type Profile={id:string;clerk_user_id:string;email?:string;name?:string;avatar_url?:string}
export async function getProfileByClerkId(clerkId:string):Promise<Profile|null>{
  const rows=await restGet('profiles_api',{select:'*',clerk_user_id:`eq.${clerkId}`})
  return Array.isArray(rows)&&rows.length?rows[0]:null
}
export async function upsertProfile(p:Profile):Promise<Profile>{
  const existing=await getProfileByClerkId(p.clerk_user_id)
  if(!existing){const rows=await restInsert('profiles_api',p);return rows[0]}
  const rows=await restPatch('profiles_api',{id:`eq.${existing.id}`},p);return rows[0]
}
type PropertyInsert={name:string;address_jsonb:any;property_type:string;unit?:string;bedrooms?:number;bathrooms?:number}
export async function insertProperty(payload:PropertyInsert){
  const address=formatAddressFromJson(payload.address_jsonb,payload.unit)
  const rows=await restInsert('properties',{...payload,address})
  return rows[0]
}
TS

echo "1) Open supabase/sql/1002_properties_address_fallback.sql and paste it into Supabase SQL editor, run it."
echo "2) Restart the dev server with a clean cache."