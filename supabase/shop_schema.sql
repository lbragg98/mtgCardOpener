-- Supabase schema for cosmetic shop ownership and equipped cosmetics.
-- Run this in the Supabase SQL editor or adapt it into a CLI migration.

create extension if not exists pgcrypto;

create table if not exists public.user_shop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id text not null,
  purchased_at timestamptz default now(),
  unique(user_id, item_id)
);

create table if not exists public.user_equipped_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  equip_slot text not null,
  item_id text not null,
  updated_at timestamptz default now(),
  unique(user_id, equip_slot)
);

create index if not exists user_shop_items_user_id_idx on public.user_shop_items(user_id);
create index if not exists user_shop_items_item_id_idx on public.user_shop_items(item_id);
create index if not exists user_equipped_cosmetics_user_id_idx on public.user_equipped_cosmetics(user_id);
create index if not exists user_equipped_cosmetics_equip_slot_idx on public.user_equipped_cosmetics(equip_slot);

alter table public.user_shop_items enable row level security;
alter table public.user_equipped_cosmetics enable row level security;

drop policy if exists "Users can select their own shop items" on public.user_shop_items;
create policy "Users can select their own shop items"
on public.user_shop_items for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own shop items" on public.user_shop_items;
create policy "Users can insert their own shop items"
on public.user_shop_items for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own shop items" on public.user_shop_items;
create policy "Users can delete their own shop items"
on public.user_shop_items for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can select their own equipped cosmetics" on public.user_equipped_cosmetics;
create policy "Users can select their own equipped cosmetics"
on public.user_equipped_cosmetics for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own equipped cosmetics" on public.user_equipped_cosmetics;
create policy "Users can insert their own equipped cosmetics"
on public.user_equipped_cosmetics for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own equipped cosmetics" on public.user_equipped_cosmetics;
create policy "Users can update their own equipped cosmetics"
on public.user_equipped_cosmetics for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own equipped cosmetics" on public.user_equipped_cosmetics;
create policy "Users can delete their own equipped cosmetics"
on public.user_equipped_cosmetics for delete
to authenticated
using (user_id = auth.uid());
