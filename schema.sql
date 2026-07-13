-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run individual sections if something fails partway.

-- ============ TABLES ============

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  pair text,
  direction text,
  session text,
  htf_anchor text,
  entry numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percent numeric,
  rr_planned numeric,
  rr_achieved numeric,
  outcome text default 'open',
  checklist jsonb default '{}'::jsonb,
  notes text
);

create table if not exists screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_idx on trades(user_id);
create index if not exists screenshots_trade_id_idx on screenshots(trade_id);

-- ============ ROW LEVEL SECURITY ============

alter table trades enable row level security;
alter table screenshots enable row level security;

-- Trades: a user can only see/edit/delete their own rows.
drop policy if exists "trades_select_own" on trades;
create policy "trades_select_own" on trades
  for select using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on trades;
create policy "trades_insert_own" on trades
  for insert with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on trades;
create policy "trades_update_own" on trades
  for update using (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on trades;
create policy "trades_delete_own" on trades
  for delete using (auth.uid() = user_id);

-- Screenshots: access allowed only if you own the parent trade.
drop policy if exists "screenshots_select_own" on screenshots;
create policy "screenshots_select_own" on screenshots
  for select using (
    exists (select 1 from trades t where t.id = trade_id and t.user_id = auth.uid())
  );

drop policy if exists "screenshots_insert_own" on screenshots;
create policy "screenshots_insert_own" on screenshots
  for insert with check (
    exists (select 1 from trades t where t.id = trade_id and t.user_id = auth.uid())
  );

drop policy if exists "screenshots_delete_own" on screenshots;
create policy "screenshots_delete_own" on screenshots
  for delete using (
    exists (select 1 from trades t where t.id = trade_id and t.user_id = auth.uid())
  );

-- ============ STORAGE BUCKET ============
-- Creates a private bucket for screenshots. Files are stored under a path like:
--   <user_id>/<trade_id>/<filename>
-- which the policies below use to restrict access to the owner only.

insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "screenshots_storage_select_own" on storage.objects;
create policy "screenshots_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "screenshots_storage_insert_own" on storage.objects;
create policy "screenshots_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "screenshots_storage_delete_own" on storage.objects;
create policy "screenshots_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
