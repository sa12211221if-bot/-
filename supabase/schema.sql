-- ─────────────────────────────────────────────────────────────────────
-- عبد سيف — Supabase schema for cross-device sync
-- Run this once in the Supabase SQL editor after creating your project.
-- ─────────────────────────────────────────────────────────────────────

-- Single key/value-style table that mirrors all local IndexedDB stores.
-- Each row is a (store, id) tuple owned by exactly one user.
create table if not exists public.app_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  store      text        not null,
  id         text        not null,
  payload    jsonb,
  updated_at bigint      not null default (extract(epoch from now()) * 1000)::bigint,
  deleted    boolean     not null default false,
  primary key (user_id, store, id)
);

create index if not exists app_data_user_updated_idx
  on public.app_data (user_id, updated_at);

-- Row-Level Security: each user only sees their own rows.
alter table public.app_data enable row level security;

drop policy if exists "app_data_select_own" on public.app_data;
create policy "app_data_select_own"
  on public.app_data for select
  using (auth.uid() = user_id);

drop policy if exists "app_data_insert_own" on public.app_data;
create policy "app_data_insert_own"
  on public.app_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_data_update_own" on public.app_data;
create policy "app_data_update_own"
  on public.app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_data_delete_own" on public.app_data;
create policy "app_data_delete_own"
  on public.app_data for delete
  using (auth.uid() = user_id);

-- Optional: enable Realtime so other open sessions get pushed updates.
-- (Run only if you want push-based sync; the app also polls every 60s.)
-- alter publication supabase_realtime add table public.app_data;
