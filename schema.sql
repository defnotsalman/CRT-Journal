-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run individual sections if something fails partway.

-- ============ TABLES ============

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  friend_code text unique,
  last_seen timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending', -- 'pending' or 'accepted'
  created_at timestamptz not null default now(),
  unique (requester_id, receiver_id)
);

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

alter table profiles enable row level security;
alter table friendships enable row level security;
alter table trades enable row level security;
alter table screenshots enable row level security;

-- Profiles: Anyone can view profiles, only owner can edit
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);


-- Friendships: You can view if you are the requester or receiver
drop policy if exists "friendships_select_own" on friendships;
create policy "friendships_select_own" on friendships for select using (auth.uid() = requester_id or auth.uid() = receiver_id);

drop policy if exists "friendships_insert_auth" on friendships;
create policy "friendships_insert_auth" on friendships for insert with check (auth.uid() = requester_id);

drop policy if exists "friendships_update_auth" on friendships;
create policy "friendships_update_auth" on friendships for update using (auth.uid() = receiver_id);

drop policy if exists "friendships_delete_auth" on friendships;
create policy "friendships_delete_auth" on friendships for delete using (auth.uid() = requester_id or auth.uid() = receiver_id);


-- Trades: Owner can do anything. Friends (accepted) can SELECT.
drop policy if exists "trades_select_own_or_friend" on trades;
create policy "trades_select_own_or_friend" on trades for select using (
  auth.uid() = user_id or exists (
    select 1 from friendships f
    where f.status = 'accepted'
    and (
      (f.requester_id = trades.user_id and f.receiver_id = auth.uid()) or
      (f.receiver_id = trades.user_id and f.requester_id = auth.uid())
    )
  )
);

drop policy if exists "trades_insert_own" on trades;
create policy "trades_insert_own" on trades for insert with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on trades;
create policy "trades_update_own" on trades for update using (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on trades;
create policy "trades_delete_own" on trades for delete using (auth.uid() = user_id);


-- Screenshots: Same logic as trades
drop policy if exists "screenshots_select_own_or_friend" on screenshots;
create policy "screenshots_select_own_or_friend" on screenshots for select using (
  exists (
    select 1 from trades t
    where t.id = screenshots.trade_id
    and (
      t.user_id = auth.uid() or exists (
        select 1 from friendships f
        where f.status = 'accepted'
        and (
          (f.requester_id = t.user_id and f.receiver_id = auth.uid()) or
          (f.receiver_id = t.user_id and f.requester_id = auth.uid())
        )
      )
    )
  )
);

drop policy if exists "screenshots_insert_own" on screenshots;
create policy "screenshots_insert_own" on screenshots for insert with check (
  exists (select 1 from trades t where t.id = trade_id and t.user_id = auth.uid())
);

drop policy if exists "screenshots_delete_own" on screenshots;
create policy "screenshots_delete_own" on screenshots for delete using (
  exists (select 1 from trades t where t.id = trade_id and t.user_id = auth.uid())
);


-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

-- Storage SELECT: Owners can select. Friends should be able to select, but Supabase Storage RLS doesn't easily join to relational tables without complex functions.
-- For simplicity and performance, we'll allow any authenticated user to SELECT from the bucket, 
-- but the UI only gives them the file paths if they have access to the `screenshots` table (via the secure RLS above).
drop policy if exists "screenshots_storage_select_auth" on storage.objects;
create policy "screenshots_storage_select_auth" on storage.objects
  for select using (bucket_id = 'trade-screenshots' and auth.role() = 'authenticated');

drop policy if exists "screenshots_storage_insert_own" on storage.objects;
create policy "screenshots_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "screenshots_storage_delete_own" on storage.objects;
create policy "screenshots_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============ EDUCATION POSTS (Community Board) ============
create table if not exists education_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  title text not null,
  content text,
  link_url text,
  created_at timestamptz not null default now()
);

alter table education_posts enable row level security;

drop policy if exists "education_posts_select_all" on education_posts;
create policy "education_posts_select_all" on education_posts for select using (auth.role() = 'authenticated');

drop policy if exists "education_posts_insert_auth" on education_posts;
create policy "education_posts_insert_auth" on education_posts for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "education_posts_delete_own" on education_posts;
create policy "education_posts_delete_own" on education_posts for delete using (auth.uid() = user_id);

-- ============ EPHEMERAL MESSAGES (Live Chat) ============
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  reply_to uuid references messages(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- Only friends can read, and only messages < 12 hours old
drop policy if exists "messages_select_friends_12h" on messages;
create policy "messages_select_friends_12h" on messages for select using (
  created_at > now() - interval '12 hours'
  and (
    user_id = auth.uid() or exists (
      select 1 from friendships f
      where f.status = 'accepted'
      and (
        (f.requester_id = messages.user_id and f.receiver_id = auth.uid()) or
        (f.receiver_id = messages.user_id and f.requester_id = auth.uid())
      )
    )
  )
);

drop policy if exists "messages_insert_own" on messages;
create policy "messages_insert_own" on messages for insert with check (auth.uid() = user_id);

drop policy if exists "messages_delete_all" on messages;
create policy "messages_delete_all" on messages for delete using (auth.role() = 'authenticated');

-- Enable Realtime for live chat (already run)
-- alter publication supabase_realtime add table messages;
