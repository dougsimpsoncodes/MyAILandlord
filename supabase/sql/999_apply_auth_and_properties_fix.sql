create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.clerk_id_to_uuid(clerk_id text)
returns uuid language sql immutable as $$
  select uuid_generate_v5(uuid_ns_url(), coalesce(clerk_id,''));
$$;

create or replace function public.auth_uid_compat()
returns uuid language plpgsql stable as $$
declare sub text;
begin
  select auth.jwt()->>'sub' into sub;
  if sub is null or sub = '' then return null; end if;
  if sub ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' then
    return sub::uuid;
  else
    return public.clerk_id_to_uuid(sub);
  end if;
end $$;

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
returns trigger language plpgsql as $$
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
end $$;

drop trigger if exists trg_properties_owner_fill on public.properties;
create trigger trg_properties_owner_fill
before insert or update on public.properties
for each row execute function public.properties_owner_fill();