-- Migration: Update RLS policies for Supabase Auth
-- This migration updates all RLS policies to use auth.uid() instead of clerk_user_id

-- Drop all existing policies to rebuild with auth.uid() pattern
do $$
begin
  -- Drop profiles policies
  drop policy if exists profiles_select_own on public.profiles;
  drop policy if exists profiles_insert_own on public.profiles;
  drop policy if exists profiles_update_own on public.profiles;

  -- Drop properties policies
  drop policy if exists properties_select_on_ownership_or_link on public.properties;
  drop policy if exists properties_insert_by_landlord on public.properties;
  drop policy if exists properties_update_by_landlord on public.properties;
  drop policy if exists properties_delete_by_landlord on public.properties;

  -- Drop tenant_property_links policies
  drop policy if exists tpl_select_landlord_or_self on public.tenant_property_links;
  drop policy if exists tpl_insert_landlord_or_tenant on public.tenant_property_links;
  drop policy if exists tpl_update_landlord_only on public.tenant_property_links;
  drop policy if exists tpl_delete_landlord_only on public.tenant_property_links;

  -- Drop maintenance_requests policies
  drop policy if exists mr_select_tenant_or_landlord on public.maintenance_requests;
  drop policy if exists mr_insert_tenant_own_property on public.maintenance_requests;
  drop policy if exists mr_update_tenant_or_landlord on public.maintenance_requests;

  -- Drop messages policies
  drop policy if exists messages_select_own on public.messages;
  drop policy if exists messages_insert_self on public.messages;
  drop policy if exists messages_update_sender_or_recipient on public.messages;

  -- Drop announcements policies
  drop policy if exists announcements_select_landlord_or_published on public.announcements;
  drop policy if exists announcements_insert_landlord on public.announcements;
  drop policy if exists announcements_update_landlord on public.announcements;
  drop policy if exists announcements_delete_landlord on public.announcements;

exception when others then
  null; -- Ignore errors if policies don't exist
end $$;

-- PROFILES: Users can only access their own profile
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- PROPERTIES: Landlords own, tenants access via link
create policy properties_select_on_ownership_or_link on public.properties
  for select using (
    landlord_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
    or id in (
      select property_id from public.tenant_property_links tpl
      join public.profiles p on p.id = tpl.tenant_id
      where p.id = auth.uid()
        and p.role = 'tenant'
        and tpl.is_active = true
    )
  );

create policy properties_insert_by_landlord on public.properties
  for insert with check (
    landlord_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

create policy properties_update_by_landlord on public.properties
  for update using (
    landlord_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

create policy properties_delete_by_landlord on public.properties
  for delete using (
    landlord_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

-- TENANT_PROPERTY_LINKS: Landlords + self-tenants
create policy tpl_select_landlord_or_self on public.tenant_property_links
  for select using (
    -- Landlord can see their properties' links
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles
        where id = auth.uid() and role = 'landlord'
      )
    )
    or
    -- Tenants can see their own links
    tenant_id = auth.uid()
  );

create policy tpl_insert_landlord_or_tenant on public.tenant_property_links
  for insert with check (
    -- Landlord can create links for their properties
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles
        where id = auth.uid() and role = 'landlord'
      )
    )
    or
    -- Tenants can create their own links
    tenant_id = auth.uid()
  );

create policy tpl_update_landlord_only on public.tenant_property_links
  for update using (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles
        where id = auth.uid() and role = 'landlord'
      )
    )
  );

create policy tpl_delete_landlord_only on public.tenant_property_links
  for delete using (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles
        where id = auth.uid() and role = 'landlord'
      )
    )
  );

-- MAINTENANCE_REQUESTS: Tenant (own) + Landlord (property)
create policy mr_select_tenant_or_landlord on public.maintenance_requests
  for select using (
    -- Tenant owns the request
    tenant_id = auth.uid()
    or
    -- Landlord owns the property
    property_id in (
      select id from public.properties
      where landlord_id = auth.uid()
    )
  );

create policy mr_insert_tenant_own_property on public.maintenance_requests
  for insert with check (
    -- Tenant can only create for properties they're linked to
    tenant_id = auth.uid()
    and property_id in (
      select property_id from public.tenant_property_links
      where tenant_id = auth.uid() and is_active = true
    )
  );

create policy mr_update_tenant_or_landlord on public.maintenance_requests
  for update using (
    tenant_id = auth.uid()
    or property_id in (
      select id from public.properties
      where landlord_id = auth.uid()
    )
  );

-- MESSAGES: Sender or recipient
create policy messages_select_own on public.messages
  for select using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );

create policy messages_insert_self on public.messages
  for insert with check (sender_id = auth.uid());

create policy messages_update_sender_or_recipient on public.messages
  for update using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );

-- ANNOUNCEMENTS: Landlords manage, all can read published
create policy announcements_select_landlord_or_published on public.announcements
  for select using (
    -- Everyone sees published
    is_published = true
    or
    -- Landlord sees all their announcements
    author_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

create policy announcements_insert_landlord on public.announcements
  for insert with check (
    author_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

create policy announcements_update_landlord on public.announcements
  for update using (
    author_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );

create policy announcements_delete_landlord on public.announcements
  for delete using (
    author_id in (
      select id from public.profiles
      where id = auth.uid() and role = 'landlord'
    )
  );
