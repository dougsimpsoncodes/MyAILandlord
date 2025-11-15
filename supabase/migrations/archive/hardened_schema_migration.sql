-- HARDENED SCHEMA MIGRATION - SAFE TO RE-RUN
-- This is the idempotent "verify & harden" SQL for Supabase SQL Editor
-- Transforms tenant comms → inventory schema with RLS hardening

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

alter table public.properties
  alter column id set default gen_random_uuid();

alter table public.properties
  add column if not exists user_id uuid,
  add column if not exists property_type text,
  add column if not exists unit text,
  add column if not exists bedrooms integer default 0,
  add column if not exists bathrooms numeric(2,1) default 0,
  add column if not exists address_jsonb jsonb;

alter table public.properties
  alter column user_id set default auth.uid();

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'check_property_type' and conrelid = 'public.properties'::regclass
  ) then
    alter table public.properties
      add constraint check_property_type
      check (property_type in ('apartment','house','condo','townhouse'));
  end if;
end $;

update public.properties
set address_jsonb = jsonb_build_object(
  'line1', address,
  'line2', '',
  'city', '',
  'state', '',
  'zipCode', '',
  'country', 'US'
)
where address_jsonb is null and address is not null;

update public.properties
set user_id = landlord_id
where user_id is null and landlord_id is not null;

create table if not exists public.property_areas (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  area_type text not null,
  icon_name text,
  is_default boolean default false,
  photos text[],
  inventory_complete boolean default false,
  condition text default 'good',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'check_area_condition' and conrelid = 'public.property_areas'::regclass
  ) then
    alter table public.property_areas
      add constraint check_area_condition
      check (condition in ('excellent','good','fair','poor'));
  end if;
end $;

create table if not exists public.property_assets (
  id uuid primary key default uuid_generate_v4(),
  area_id uuid not null references public.property_areas(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  asset_type text not null,
  category text not null,
  subcategory text,
  brand text,
  model text,
  serial_number text,
  condition text default 'good',
  installation_date date,
  warranty_start_date date,
  warranty_end_date date,
  warranty_provider text,
  photos text[],
  manual_url text,
  notes text,
  purchase_price numeric(10,2),
  current_value numeric(10,2),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'check_asset_condition' and conrelid = 'public.property_assets'::regclass
  ) then
    alter table public.property_assets
      add constraint check_asset_condition
      check (condition in ('excellent','good','fair','poor','needs_replacement'));
  end if;
end $;

create index if not exists idx_properties_user_id on public.properties(user_id);
create index if not exists idx_property_areas_property_id on public.property_areas(property_id);
create index if not exists idx_property_assets_area_id on public.property_assets(area_id);
create index if not exists idx_property_assets_property_id on public.property_assets(property_id);
create index if not exists idx_property_assets_condition on public.property_assets(condition);
create index if not exists idx_property_assets_warranty_end on public.property_assets(warranty_end_date);

alter table public.properties enable row level security;
alter table public.property_areas enable row level security;
alter table public.property_assets enable row level security;

do $
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='properties' and policyname='properties_select_own') then
    create policy properties_select_own on public.properties for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='properties' and policyname='properties_insert_own') then
    create policy properties_insert_own on public.properties for insert with check (auth.uid() = coalesce(user_id, auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='properties' and policyname='properties_update_own') then
    create policy properties_update_own on public.properties for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='properties' and policyname='properties_delete_own') then
    create policy properties_delete_own on public.properties for delete using (auth.uid() = user_id);
  end if;
end $;

do $
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='property_areas' and policyname='property_areas_select_own') then
    create policy property_areas_select_own on public.property_areas for select using (
      exists (select 1 from public.properties p where p.id = property_areas.property_id and p.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='property_areas' and policyname='property_areas_crud_own') then
    create policy property_areas_crud_own on public.property_areas for all using (
      exists (select 1 from public.properties p where p.id = property_areas.property_id and p.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.properties p where p.id = property_areas.property_id and p.user_id = auth.uid())
    );
  end if;
end $;

do $
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='property_assets' and policyname='property_assets_select_own') then
    create policy property_assets_select_own on public.property_assets for select using (
      exists (select 1 from public.properties p where p.id = property_assets.property_id and p.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='property_assets' and policyname='property_assets_crud_own') then
    create policy property_assets_crud_own on public.property_assets for all using (
      exists (select 1 from public.properties p where p.id = property_assets.property_id and p.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.properties p where p.id = property_assets.property_id and p.user_id = auth.uid())
    );
  end if;
end $;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $
begin
  new.updated_at := now();
  return new;
end $;

do $
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_properties_updated_at') then
    create trigger trg_properties_updated_at before update on public.properties for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_property_areas_updated_at') then
    create trigger trg_property_areas_updated_at before update on public.property_areas for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_property_assets_updated_at') then
    create trigger trg_property_assets_updated_at before update on public.property_assets for each row execute function public.set_updated_at();
  end if;
end $;