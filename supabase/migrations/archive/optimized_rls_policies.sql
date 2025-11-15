-- OPTIMIZED RLS POLICIES - PERFORMANCE & SECURITY HARDENED
-- Eliminates duplicate policies and uses SELECT auth.uid() pattern for performance

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_areas enable row level security;
alter table public.property_assets enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy profiles_select_own on public.profiles for select using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete using ((select auth.uid()) = id);

drop policy if exists properties_select_own on public.properties;
drop policy if exists properties_insert_own on public.properties;
drop policy if exists properties_update_own on public.properties;
drop policy if exists properties_delete_own on public.properties;

create policy properties_select_own on public.properties for select using ((select auth.uid()) = user_id);
create policy properties_insert_own on public.properties for insert with check ((select auth.uid()) = coalesce(user_id,(select auth.uid())));
create policy properties_update_own on public.properties for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy properties_delete_own on public.properties for delete using ((select auth.uid()) = user_id);

drop policy if exists property_areas_select_own on public.property_areas;
drop policy if exists property_areas_crud_own on public.property_areas;

create policy property_areas_select_own on public.property_areas for select using (exists (select 1 from public.properties p where p.id = public.property_areas.property_id and p.user_id = (select auth.uid())));
create policy property_areas_insert_own on public.property_areas for insert with check (exists (select 1 from public.properties p where p.id = public.property_areas.property_id and p.user_id = (select auth.uid())));
create policy property_areas_update_own on public.property_areas for update using (exists (select 1 from public.properties p where p.id = public.property_areas.property_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.properties p where p.id = public.property_areas.property_id and p.user_id = (select auth.uid())));
create policy property_areas_delete_own on public.property_areas for delete using (exists (select 1 from public.properties p where p.id = public.property_areas.property_id and p.user_id = (select auth.uid())));

drop policy if exists property_assets_select_own on public.property_assets;
drop policy if exists property_assets_crud_own on public.property_assets;

create policy property_assets_select_own on public.property_assets for select using (exists (select 1 from public.properties p where p.id = public.property_assets.property_id and p.user_id = (select auth.uid())));
create policy property_assets_insert_own on public.property_assets for insert with check (exists (select 1 from public.properties p where p.id = public.property_assets.property_id and p.user_id = (select auth.uid())));
create policy property_assets_update_own on public.property_assets for update using (exists (select 1 from public.properties p where p.id = public.property_assets.property_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.properties p where p.id = public.property_assets.property_id and p.user_id = (select auth.uid())));
create policy property_assets_delete_own on public.property_assets for delete using (exists (select 1 from public.properties p where p.id = public.property_assets.property_id and p.user_id = (select auth.uid())));