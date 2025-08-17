alter table public.profiles alter column clerk_user_id type text using clerk_user_id::text;
create index if not exists idx_profiles_clerk_user_id on public.profiles(clerk_user_id);
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (clerk_user_id = (select current_setting('request.jwt.claims', true)::json->>'sub'));
create policy profiles_insert_own on public.profiles for insert with check (clerk_user_id = (select current_setting('request.jwt.claims', true)::json->>'sub'));
create policy profiles_update_own on public.profiles for update using (clerk_user_id = (select current_setting('request.jwt.claims', true)::json->>'sub')) with check (clerk_user_id = (select current_setting('request.jwt.claims', true)::json->>'sub'));
create policy profiles_delete_own on public.profiles for delete using (clerk_user_id = (select current_setting('request.jwt.claims', true)::json->>'sub'));
create or replace view public.profiles_api as
select id, clerk_user_id::text as clerk_user_id, email, name, avatar_url, created_at, updated_at
from public.profiles;
alter view public.profiles_api set (security_barrier = true);