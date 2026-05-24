alter table public.user_cards
  add column if not exists set_code text,
  add column if not exists set_name text,
  add column if not exists collector_number text,
  add column if not exists rarity text,
  add column if not exists image_url text,
  add column if not exists is_foil boolean default false,
  add column if not exists foil_treatment text default 'none',
  add column if not exists is_collector_exclusive boolean default false,
  add column if not exists is_one_of_one boolean default false,
  add column if not exists special_pull_type text,
  add column if not exists prices jsonb default '{}'::jsonb,
  add column if not exists opened_at timestamptz default now();

alter table public.user_cards enable row level security;

drop policy if exists "Users can read their own cards" on public.user_cards;
create policy "Users can read their own cards"
on public.user_cards for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cards" on public.user_cards;
create policy "Users can insert their own cards"
on public.user_cards for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cards" on public.user_cards;
create policy "Users can update their own cards"
on public.user_cards for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own cards" on public.user_cards;
create policy "Users can delete their own cards"
on public.user_cards for delete
to authenticated
using (auth.uid() = user_id);
