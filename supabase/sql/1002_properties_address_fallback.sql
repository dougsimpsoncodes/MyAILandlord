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
