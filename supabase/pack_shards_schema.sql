create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pack_shards integer not null default 0 check (pack_shards >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_wallets enable row level security;

drop policy if exists "Users can select their own wallet" on public.user_wallets;
create policy "Users can select their own wallet"
on public.user_wallets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own wallet" on public.user_wallets;
create policy "Users can insert their own wallet"
on public.user_wallets
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own wallet" on public.user_wallets;
create policy "Users can update their own wallet"
on public.user_wallets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.ensure_user_wallet(p_initial_shards integer default 0)
returns public.user_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets%rowtype;
begin
  if v_user_id is null then
    raise exception 'You need to be logged in to use Pack Shards.';
  end if;

  insert into public.user_wallets (user_id, pack_shards)
  values (v_user_id, greatest(0, coalesce(p_initial_shards, 0)))
  on conflict (user_id) do nothing;

  select *
  into v_wallet
  from public.user_wallets
  where user_id = v_user_id;

  return v_wallet;
end;
$$;

create or replace function public.adjust_pack_shards(p_delta integer)
returns public.user_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets%rowtype;
begin
  if v_user_id is null then
    raise exception 'You need to be logged in to use Pack Shards.';
  end if;

  perform public.ensure_user_wallet(0);

  update public.user_wallets
  set
    pack_shards = pack_shards + coalesce(p_delta, 0),
    updated_at = now()
  where user_id = v_user_id
    and pack_shards + coalesce(p_delta, 0) >= 0
  returning *
  into v_wallet;

  if not found then
    raise exception 'Not enough Pack Shards.';
  end if;

  return v_wallet;
end;
$$;

grant execute on function public.ensure_user_wallet(integer) to authenticated;
grant execute on function public.adjust_pack_shards(integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'user_wallets'
    )
  then
    alter publication supabase_realtime add table public.user_wallets;
  end if;
end $$;
