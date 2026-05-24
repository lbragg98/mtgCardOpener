create table if not exists public.battle_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  visibility text default 'private' not null check (visibility in ('private', 'friends', 'public')),
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_battle_decks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_battle_decks_updated_at on public.battle_decks;
create trigger set_battle_decks_updated_at
before update on public.battle_decks
for each row execute function public.set_battle_decks_updated_at();

alter table public.battle_decks
add column if not exists visibility text default 'private' not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'battle_decks_visibility_check'
      and conrelid = 'public.battle_decks'::regclass
  ) then
    alter table public.battle_decks
    add constraint battle_decks_visibility_check
    check (visibility in ('private', 'friends', 'public'));
  end if;
end $$;

alter table public.battle_decks enable row level security;

drop policy if exists "Users can select their own battle decks" on public.battle_decks;
create policy "Users can select their own battle decks"
on public.battle_decks
for select
using (auth.uid() = user_id);

drop policy if exists "Friends can select visible battle decks" on public.battle_decks;
create policy "Friends can select visible battle decks"
on public.battle_decks
for select
using (
  visibility = 'public'
  or (
    visibility = 'friends'
    and exists (
      select 1
      from public.friendships
      where friendships.user_id = auth.uid()
        and friendships.friend_id = battle_decks.user_id
    )
  )
);

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
