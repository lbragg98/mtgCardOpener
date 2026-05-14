create table if not exists public.battle_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.battle_decks enable row level security;

drop policy if exists "Users can select their own battle decks" on public.battle_decks;
create policy "Users can select their own battle decks"
on public.battle_decks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own battle decks" on public.battle_decks;
create policy "Users can insert their own battle decks"
on public.battle_decks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own battle decks" on public.battle_decks;
create policy "Users can update their own battle decks"
on public.battle_decks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own battle decks" on public.battle_decks;
create policy "Users can delete their own battle decks"
on public.battle_decks
for delete
using (auth.uid() = user_id);
