-- Supabase schema for auth profiles, cloud card collections, friends, and trades.
-- Run this in the Supabase SQL editor or adapt it into a CLI migration.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Stores public profile information for authenticated users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stores each owned card copy in a user's cloud collection.
create table if not exists public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  scryfall_id text not null,
  name text not null,
  set_code text,
  set_name text,
  collector_number text,
  rarity text,
  image_url text,
  is_foil boolean default false,
  foil_treatment text default 'none',
  is_collector_exclusive boolean default false,
  is_one_of_one boolean default false,
  special_pull_type text null,
  prices jsonb default '{}'::jsonb,
  opened_at timestamptz default now(),
  source_pack_id uuid null,
  booster_type text null,
  pack_number integer null,
  bulk_opening_id uuid null,
  created_at timestamptz default now()
);

alter table public.user_cards
  add column if not exists booster_type text null,
  add column if not exists pack_number integer null,
  add column if not exists bulk_opening_id uuid null;

-- Stores purchased binders for authenticated users.
create table if not exists public.owned_binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  binder_id text not null,
  equipped_clasp_id text null,
  equipped_page_style_id text null,
  equipped_slot_frame_id text null,
  equipped_aura_id text null,
  purchased_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, binder_id)
);

alter table public.owned_binders
  add column if not exists equipped_clasp_id text null,
  add column if not exists equipped_page_style_id text null,
  add column if not exists equipped_slot_frame_id text null,
  add column if not exists equipped_aura_id text null;

-- Stores cards placed into owned binders.
create table if not exists public.binder_cards (
  id uuid primary key default gen_random_uuid(),
  owned_binder_id uuid references public.owned_binders(id) on delete cascade not null,
  user_card_id uuid references public.user_cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  slot_index integer null,
  created_at timestamptz default now(),
  unique(owned_binder_id, user_card_id)
);

create table if not exists public.display_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  display_case_id text not null,
  created_at timestamptz default now()
);

create table if not exists public.display_case_cards (
  id uuid primary key default gen_random_uuid(),
  display_case_instance_id uuid references public.display_cases(id) on delete cascade not null,
  user_card_id uuid references public.user_cards(id) on delete cascade not null,
  slot_index integer null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(display_case_instance_id, user_card_id)
);

-- Stores accepted friendship relationships between users.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  friend_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, friend_id),
  check(user_id <> friend_id)
);

-- Stores pending and resolved friend requests.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check(status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_id),
  check(sender_id <> receiver_id)
);

-- Stores trade offers between users.
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check(status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stores cards attached to each side of a trade.
create table if not exists public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references public.trades(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_card_id uuid references public.user_cards(id) on delete cascade not null,
  side text not null check(side in ('offered', 'requested')),
  created_at timestamptz default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_friend_requests_updated_at on public.friend_requests;
create trigger set_friend_requests_updated_at
before update on public.friend_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists user_cards_user_id_idx on public.user_cards(user_id);
create index if not exists user_cards_scryfall_id_idx on public.user_cards(scryfall_id);
create index if not exists owned_binders_user_id_idx on public.owned_binders(user_id);
create index if not exists binder_cards_owned_binder_id_idx on public.binder_cards(owned_binder_id);
create index if not exists binder_cards_user_id_idx on public.binder_cards(user_id);
create index if not exists binder_cards_user_card_id_idx on public.binder_cards(user_card_id);
create index if not exists display_cases_user_id_idx on public.display_cases(user_id);
create index if not exists display_case_cards_instance_id_idx on public.display_case_cards(display_case_instance_id);
create index if not exists display_case_cards_user_id_idx on public.display_case_cards(user_id);
create index if not exists display_case_cards_user_card_id_idx on public.display_case_cards(user_card_id);
create index if not exists friend_requests_sender_receiver_status_idx
  on public.friend_requests(sender_id, receiver_id, status);
create index if not exists friendships_user_friend_idx on public.friendships(user_id, friend_id);
create index if not exists trades_sender_receiver_status_idx on public.trades(sender_id, receiver_id, status);
create index if not exists trade_items_trade_id_idx on public.trade_items(trade_id);

alter table public.profiles enable row level security;
alter table public.user_cards enable row level security;
alter table public.owned_binders enable row level security;
alter table public.binder_cards enable row level security;
alter table public.display_cases enable row level security;
alter table public.display_case_cards enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;

drop policy if exists "Profiles are searchable by all users" on public.profiles;
drop policy if exists "Profiles are searchable by authenticated users" on public.profiles;
create policy "Profiles are searchable by all users"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can select their own cards" on public.user_cards;
drop policy if exists "Users can select own and friends cards" on public.user_cards;
create policy "Users can select own and friends cards"
on public.user_cards for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.friendships
    where friendships.user_id = auth.uid()
      and friendships.friend_id = user_cards.user_id
  )
);

drop policy if exists "Users can insert their own cards" on public.user_cards;
create policy "Users can insert their own cards"
on public.user_cards for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own cards" on public.user_cards;
create policy "Users can update their own cards"
on public.user_cards for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own cards" on public.user_cards;
create policy "Users can delete their own cards"
on public.user_cards for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their own binders" on public.owned_binders;
create policy "Users can select their own binders"
on public.owned_binders for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own binders" on public.owned_binders;
create policy "Users can insert their own binders"
on public.owned_binders for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own binders" on public.owned_binders;
create policy "Users can update their own binders"
on public.owned_binders for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own binders" on public.owned_binders;
create policy "Users can delete their own binders"
on public.owned_binders for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their own binder cards" on public.binder_cards;
create policy "Users can select their own binder cards"
on public.binder_cards for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own binder cards" on public.binder_cards;
create policy "Users can insert their own binder cards"
on public.binder_cards for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.owned_binders
    where owned_binders.id = binder_cards.owned_binder_id
      and owned_binders.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_cards
    where user_cards.id = binder_cards.user_card_id
      and user_cards.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their own binder cards" on public.binder_cards;
create policy "Users can delete their own binder cards"
on public.binder_cards for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their own display cases" on public.display_cases;
create policy "Users can select their own display cases"
on public.display_cases for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own display cases" on public.display_cases;
create policy "Users can insert their own display cases"
on public.display_cases for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own display cases" on public.display_cases;
create policy "Users can update their own display cases"
on public.display_cases for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own display cases" on public.display_cases;
create policy "Users can delete their own display cases"
on public.display_cases for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their own display case cards" on public.display_case_cards;
create policy "Users can select their own display case cards"
on public.display_case_cards for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own display case cards" on public.display_case_cards;
create policy "Users can insert their own display case cards"
on public.display_case_cards for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.display_cases
    where display_cases.id = display_case_cards.display_case_instance_id
      and display_cases.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_cards
    where user_cards.id = display_case_cards.user_card_id
      and user_cards.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own display case cards" on public.display_case_cards;
create policy "Users can update their own display case cards"
on public.display_case_cards for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own display case cards" on public.display_case_cards;
create policy "Users can delete their own display case cards"
on public.display_case_cards for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their friend requests" on public.friend_requests;
create policy "Users can select their friend requests"
on public.friend_requests for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
on public.friend_requests for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "Users can update their friend requests" on public.friend_requests;
create policy "Users can update their friend requests"
on public.friend_requests for update
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid())
with check (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can select their friendships" on public.friendships;
create policy "Users can select their friendships"
on public.friendships for select
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "Users can insert their own friendship rows" on public.friendships;
drop policy if exists "Users can insert friendship rows for accepted requests" on public.friendships;
create policy "Users can insert friendship rows for accepted requests"
on public.friendships for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.friend_requests
    where friend_requests.status = 'accepted'
      and (
        (
          friend_requests.sender_id = friendships.user_id
          and friend_requests.receiver_id = friendships.friend_id
          and friend_requests.receiver_id = auth.uid()
        )
        or (
          friend_requests.receiver_id = friendships.user_id
          and friend_requests.sender_id = friendships.friend_id
          and friend_requests.sender_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can delete their friendships" on public.friendships;
create policy "Users can delete their friendships"
on public.friendships for delete
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "Users can select their trades" on public.trades;
create policy "Users can select their trades"
on public.trades for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can create sent trades" on public.trades;
create policy "Users can create sent trades"
on public.trades for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "Users can update their trades" on public.trades;
create policy "Users can update their trades"
on public.trades for update
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid())
with check (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can select trade items for their trades" on public.trade_items;
create policy "Users can select trade items for their trades"
on public.trade_items for select
to authenticated
using (
  exists (
    select 1
    from public.trades
    where trades.id = trade_items.trade_id
      and (trades.sender_id = auth.uid() or trades.receiver_id = auth.uid())
  )
);

drop policy if exists "Users can insert trade items for their trades" on public.trade_items;
create policy "Users can insert trade items for their trades"
on public.trade_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.trades
    where trades.id = trade_items.trade_id
      and (
        (trades.sender_id = auth.uid() and trade_items.user_id in (trades.sender_id, trades.receiver_id))
        or (trades.receiver_id = auth.uid() and trade_items.user_id = trades.receiver_id)
      )
  )
);

drop policy if exists "Users can delete trade items for their trades" on public.trade_items;
create policy "Users can delete trade items for their trades"
on public.trade_items for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trades
    where trades.id = trade_items.trade_id
      and (trades.sender_id = auth.uid() or trades.receiver_id = auth.uid())
  )
);

create or replace function public.accept_trade(p_trade_id uuid)
returns public.trades
language plpgsql
security definer
set search_path = public
as $$
declare
  trade_row public.trades%rowtype;
  missing_count integer;
begin
  select *
  into trade_row
  from public.trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade not found.';
  end if;

  if trade_row.status <> 'pending' then
    raise exception 'Trade is no longer pending.';
  end if;

  if trade_row.receiver_id <> auth.uid() then
    raise exception 'Only the receiver can accept this trade.';
  end if;

  select count(*)
  into missing_count
  from public.trade_items ti
  join public.user_cards uc on uc.id = ti.user_card_id
  where ti.trade_id = p_trade_id
    and (
      (ti.side = 'offered' and uc.user_id <> trade_row.sender_id)
      or (ti.side = 'requested' and uc.user_id <> trade_row.receiver_id)
    );

  if missing_count > 0 then
    raise exception 'Trade could not complete because one or more cards are no longer available.';
  end if;

  update public.user_cards
  set user_id = trade_row.receiver_id
  where id in (
    select user_card_id
    from public.trade_items
    where trade_items.trade_id = p_trade_id
      and side = 'offered'
  );

  update public.user_cards
  set user_id = trade_row.sender_id
  where id in (
    select user_card_id
    from public.trade_items
    where trade_items.trade_id = p_trade_id
      and side = 'requested'
  );

  update public.trades
  set status = 'accepted',
      updated_at = now()
  where id = p_trade_id
  returning * into trade_row;

  return trade_row;
end;
$$;

grant execute on function public.accept_trade(uuid) to authenticated;
