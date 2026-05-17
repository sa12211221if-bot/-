-- عبد سيف — Supabase schema for cross-device sync
create table if not exists public.app_data (
  user_id    uuid   not null references auth.users(id) on delete cascade,
  store      text   not null,
  id         text   not null,
  payload    jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  deleted    boolean not null default false,
  primary key (user_id, store, id)
);
create index if not exists app_data_user_updated_idx on public.app_data (user_id, updated_at);
alter table public.app_data enable row level security;
drop policy if exists "sel" on public.app_data;
create policy "sel" on public.app_data for select using (auth.uid() = user_id);
drop policy if exists "ins" on public.app_data;
create policy "ins" on public.app_data for insert with check (auth.uid() = user_id);
drop policy if exists "upd" on public.app_data;
create policy "upd" on public.app_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "del" on public.app_data;
create policy "del" on public.app_data for delete using (auth.uid() = user_id);
