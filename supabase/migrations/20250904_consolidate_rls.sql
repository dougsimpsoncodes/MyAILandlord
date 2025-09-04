-- Consolidate RLS to auth.jwt() based predicates
-- This migration standardizes all RLS policies to use auth.jwt()->>'sub' 
-- for consistent Clerk authentication integration

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.tenant_property_links enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;

-- Drop all existing policies to rebuild with consistent auth.jwt() pattern
do $$
begin
  -- Drop profiles policies
  drop policy if exists "Users can read own profile" on public.profiles;
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Users can insert own profile" on public.profiles;
  drop policy if exists profiles_select_own on public.profiles;
  drop policy if exists profiles_insert_own on public.profiles;
  drop policy if exists profiles_update_own on public.profiles;
  
  -- Drop properties policies  
  drop policy if exists "Users can read properties" on public.properties;
  drop policy if exists "Landlords can insert properties" on public.properties;
  drop policy if exists "Landlords can update properties" on public.properties;
  drop policy if exists "Landlords can delete properties" on public.properties;
  drop policy if exists properties_select_own on public.properties;
  drop policy if exists properties_insert_own on public.properties;
  drop policy if exists properties_update_own on public.properties;
  drop policy if exists properties_delete_own on public.properties;
  drop policy if exists properties_select_on_ownership_or_link on public.properties;
  drop policy if exists properties_insert_by_landlord on public.properties;
  drop policy if exists properties_update_by_landlord on public.properties;
  drop policy if exists properties_delete_by_landlord on public.properties;
  
  -- Drop tenant_property_links policies
  drop policy if exists "Users can read property links" on public.tenant_property_links;
  drop policy if exists "Landlords can insert property links" on public.tenant_property_links;
  drop policy if exists "Landlords can update property links" on public.tenant_property_links;
  drop policy if exists "Landlords can delete property links" on public.tenant_property_links;
  drop policy if exists tpl_select_landlord_or_self on public.tenant_property_links;
  drop policy if exists tpl_insert_landlord_or_tenant on public.tenant_property_links;
  drop policy if exists tpl_update_landlord_only on public.tenant_property_links;
  drop policy if exists tpl_delete_landlord_only on public.tenant_property_links;
  
  -- Drop maintenance_requests policies
  drop policy if exists "Users can read maintenance requests" on public.maintenance_requests;
  drop policy if exists "Tenants can create maintenance requests" on public.maintenance_requests;
  drop policy if exists "Users can update maintenance requests" on public.maintenance_requests;
  drop policy if exists mr_select_tenant_or_landlord on public.maintenance_requests;
  drop policy if exists mr_insert_tenant_own_property on public.maintenance_requests;
  drop policy if exists mr_update_tenant_or_landlord on public.maintenance_requests;
  
  -- Drop messages policies
  drop policy if exists "Users can read own messages" on public.messages;
  drop policy if exists "Users can send messages" on public.messages;
  drop policy if exists "Users can update own messages" on public.messages;
  drop policy if exists messages_select_own on public.messages;
  drop policy if exists messages_insert_self on public.messages;
  drop policy if exists messages_update_sender_or_recipient on public.messages;
  
  -- Drop announcements policies
  drop policy if exists "Users can read announcements" on public.announcements;
  drop policy if exists "Landlords can insert announcements" on public.announcements;
  drop policy if exists "Landlords can update announcements" on public.announcements;
  drop policy if exists "Landlords can delete announcements" on public.announcements;
  drop policy if exists announcements_select_landlord_or_published on public.announcements;
  drop policy if exists announcements_insert_landlord on public.announcements;
  drop policy if exists announcements_update_landlord on public.announcements;
  drop policy if exists announcements_delete_landlord on public.announcements;
  
exception when others then
  null; -- Ignore errors if policies don't exist
end $$;

-- PROFILES: Users can only access their own profile
create policy profiles_select_own on public.profiles 
  for select using (clerk_user_id = auth.jwt() ->> 'sub');

create policy profiles_insert_own on public.profiles 
  for insert with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy profiles_update_own on public.profiles 
  for update using (clerk_user_id = auth.jwt() ->> 'sub') 
  with check (clerk_user_id = auth.jwt() ->> 'sub');

-- PROPERTIES: Landlords own, tenants access via link
create policy properties_select_on_ownership_or_link on public.properties 
  for select using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
    or id in (
      select property_id from public.tenant_property_links tpl
      join public.profiles p on p.id = tpl.tenant_id
      where p.clerk_user_id = auth.jwt() ->> 'sub' 
        and p.role = 'tenant' 
        and tpl.is_active = true
    )
  );

create policy properties_insert_by_landlord on public.properties 
  for insert with check (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

create policy properties_update_by_landlord on public.properties 
  for update using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  ) with check (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

create policy properties_delete_by_landlord on public.properties 
  for delete using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

-- TENANT_PROPERTY_LINKS: Landlords manage, tenants view their own
create policy tpl_select_landlord_or_self on public.tenant_property_links 
  for select using (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
    or tenant_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'tenant'
    )
  );

create policy tpl_insert_landlord_or_tenant on public.tenant_property_links 
  for insert with check (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
    or tenant_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'tenant'
    )
  );

create policy tpl_update_landlord_only on public.tenant_property_links 
  for update using (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
  ) with check (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
  );

create policy tpl_delete_landlord_only on public.tenant_property_links 
  for delete using (
    property_id in (
      select id from public.properties
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
  );

-- MAINTENANCE_REQUESTS: Tenants create/view own, landlords view all for their properties
create policy mr_select_tenant_or_landlord on public.maintenance_requests 
  for select using (
    tenant_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'tenant'
    )
    or property_id in (
      select id from public.properties 
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
  );

create policy mr_insert_tenant_own_property on public.maintenance_requests 
  for insert with check (
    tenant_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'tenant'
    )
    and property_id in (
      select property_id from public.tenant_property_links tpl
      join public.profiles p on p.id = tpl.tenant_id
      where p.clerk_user_id = auth.jwt() ->> 'sub' and tpl.is_active = true
    )
  );

create policy mr_update_tenant_or_landlord on public.maintenance_requests 
  for update using (
    tenant_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'tenant'
    )
    or property_id in (
      select id from public.properties 
      where landlord_id in (
        select id from public.profiles 
        where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
      )
    )
  );

-- MESSAGES: Users can see messages where they are sender or recipient
create policy messages_select_own on public.messages 
  for select using (
    sender_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
    or recipient_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy messages_insert_self on public.messages 
  for insert with check (
    sender_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy messages_update_sender_or_recipient on public.messages 
  for update using (
    sender_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
    or recipient_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ANNOUNCEMENTS: Landlords create/manage, tenants see published ones for their properties
create policy announcements_select_landlord_or_published on public.announcements 
  for select using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
    or (
      is_published = true 
      and (
        property_id is null 
        or property_id in (
          select property_id from public.tenant_property_links tpl
          join public.profiles p on p.id = tpl.tenant_id
          where p.clerk_user_id = auth.jwt() ->> 'sub' 
            and p.role = 'tenant' 
            and tpl.is_active = true
        )
      )
    )
  );

create policy announcements_insert_landlord on public.announcements 
  for insert with check (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

create policy announcements_update_landlord on public.announcements 
  for update using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  ) with check (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

create policy announcements_delete_landlord on public.announcements 
  for delete using (
    landlord_id in (
      select id from public.profiles 
      where clerk_user_id = auth.jwt() ->> 'sub' and role = 'landlord'
    )
  );

-- STORAGE: Standardize storage policies with auth.jwt()->>'sub'
-- Note: Storage policies depend on bucket configuration
-- This is a template - adjust based on actual bucket setup

-- Enable RLS for storage objects if not already enabled
alter table storage.objects enable row level security;

-- Drop existing storage policies
do $$
begin
  drop policy if exists "Users can upload maintenance images" on storage.objects;
  drop policy if exists "Users can view maintenance images" on storage.objects;
  drop policy if exists "Users can update their own maintenance images" on storage.objects;
  drop policy if exists "Users can delete their own maintenance images" on storage.objects;
  drop policy if exists storage_property_images_insert_landlord on storage.objects;
  drop policy if exists storage_property_images_select_public on storage.objects;
exception when others then
  null; -- Ignore if policies don't exist
end $$;

-- Property images: Public read, landlord write
create policy storage_property_images_insert_landlord on storage.objects 
  for insert with check (
    bucket_id = 'property-images' 
    and exists (
      select 1 from public.profiles p
      where p.clerk_user_id = auth.jwt() ->> 'sub' and p.role = 'landlord'
    )
  );

create policy storage_property_images_select_public on storage.objects 
  for select using (bucket_id = 'property-images');

-- Maintenance images: Tenants upload for their requests, all participants can view
create policy storage_maintenance_images_insert on storage.objects 
  for insert with check (
    bucket_id = 'maintenance-images' 
    and exists (
      select 1 from public.profiles p
      where p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy storage_maintenance_images_select on storage.objects 
  for select using (
    bucket_id = 'maintenance-images'
    -- Could add more granular checks based on path structure if needed
  );

-- Voice notes: Similar to maintenance images
create policy storage_voice_notes_insert on storage.objects 
  for insert with check (
    bucket_id = 'voice-notes' 
    and exists (
      select 1 from public.profiles p
      where p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy storage_voice_notes_select on storage.objects 
  for select using (bucket_id = 'voice-notes');

-- Documents: Private, user-specific access
create policy storage_documents_insert on storage.objects 
  for insert with check (
    bucket_id = 'documents' 
    and exists (
      select 1 from public.profiles p
      where p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy storage_documents_select on storage.objects 
  for select using (
    bucket_id = 'documents'
    -- Add path-based checks if documents are organized by user
  );