-- Fix property_areas RLS policies to work with Clerk auth
drop policy if exists property_areas_select_own on public.property_areas;
drop policy if exists property_areas_insert_own on public.property_areas;
drop policy if exists property_areas_update_own on public.property_areas;
drop policy if exists property_areas_delete_own on public.property_areas;

create policy property_areas_select_own on public.property_areas
  for select using (
    property_id in (
      select id from public.properties 
      where user_id = (select public.auth_uid_compat())
    )
  );

create policy property_areas_insert_own on public.property_areas
  for insert with check (
    property_id in (
      select id from public.properties 
      where user_id = (select public.auth_uid_compat())
    )
  );

create policy property_areas_update_own on public.property_areas
  for update using (
    property_id in (
      select id from public.properties 
      where user_id = (select public.auth_uid_compat())
    )
  ) with check (
    property_id in (
      select id from public.properties 
      where user_id = (select public.auth_uid_compat())
    )
  );

create policy property_areas_delete_own on public.property_areas
  for delete using (
    property_id in (
      select id from public.properties 
      where user_id = (select public.auth_uid_compat())
    )
  );