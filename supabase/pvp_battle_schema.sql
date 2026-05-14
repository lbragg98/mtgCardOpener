create table if not exists battle_challenges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  sender_deck_id uuid null,
  receiver_deck_id uuid null,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  mode text default 'human' check (mode in ('human', 'ai_friend_deck')),
  ai_difficulty text default 'normal' check (ai_difficulty in ('easy', 'normal', 'hard')),
  message text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (sender_id <> receiver_id)
);

create table if not exists battle_matches (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references battle_challenges(id) on delete set null,
  player_one_id uuid references auth.users(id) on delete cascade not null,
  player_two_id uuid references auth.users(id) on delete cascade not null,
  current_turn_user_id uuid references auth.users(id) on delete set null,
  status text default 'active' check (status in ('active', 'completed', 'cancelled', 'forfeited')),
  mode text default 'human' check (mode in ('human', 'ai_friend_deck')),
  ai_controlled_user_id uuid references auth.users(id) on delete set null,
  ai_difficulty text default 'normal' check (ai_difficulty in ('easy', 'normal', 'hard')),
  winner_id uuid references auth.users(id) on delete set null,
  player_one_deck jsonb not null default '[]'::jsonb,
  player_two_deck jsonb not null default '[]'::jsonb,
  game_state jsonb not null default '{}'::jsonb,
  turn_number integer default 1,
  last_action jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (player_one_id <> player_two_id)
);

create table if not exists battle_match_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references battle_matches(id) on delete cascade not null,
  actor_id uuid references auth.users(id) on delete cascade not null,
  action_type text not null,
  action_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table battle_challenges enable row level security;
alter table battle_matches enable row level security;
alter table battle_match_actions enable row level security;

drop policy if exists "Users can select their battle challenges" on battle_challenges;
create policy "Users can select their battle challenges"
on battle_challenges
for select
using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can insert sent battle challenges" on battle_challenges;
create policy "Users can insert sent battle challenges"
on battle_challenges
for insert
with check (sender_id = auth.uid());

drop policy if exists "Users can update their battle challenges" on battle_challenges;
create policy "Users can update their battle challenges"
on battle_challenges
for update
using (sender_id = auth.uid() or receiver_id = auth.uid())
with check (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can select their battle matches" on battle_matches;
create policy "Users can select their battle matches"
on battle_matches
for select
using (player_one_id = auth.uid() or player_two_id = auth.uid());

drop policy if exists "Users can insert their battle matches" on battle_matches;
create policy "Users can insert their battle matches"
on battle_matches
for insert
with check (player_one_id = auth.uid() or player_two_id = auth.uid());

drop policy if exists "Users can update their battle matches" on battle_matches;
create policy "Users can update their battle matches"
on battle_matches
for update
using (player_one_id = auth.uid() or player_two_id = auth.uid())
with check (player_one_id = auth.uid() or player_two_id = auth.uid());

drop policy if exists "Users can select battle match actions for their matches" on battle_match_actions;
create policy "Users can select battle match actions for their matches"
on battle_match_actions
for select
using (
  exists (
    select 1
    from battle_matches
    where battle_matches.id = battle_match_actions.match_id
      and (
        battle_matches.player_one_id = auth.uid()
        or battle_matches.player_two_id = auth.uid()
      )
  )
);

drop policy if exists "Users can insert battle match actions for their matches" on battle_match_actions;
create policy "Users can insert battle match actions for their matches"
on battle_match_actions
for insert
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from battle_matches
    where battle_matches.id = battle_match_actions.match_id
      and (
        battle_matches.player_one_id = auth.uid()
        or battle_matches.player_two_id = auth.uid()
      )
  )
);

create index if not exists battle_challenges_sender_id_idx on battle_challenges(sender_id);
create index if not exists battle_challenges_receiver_id_idx on battle_challenges(receiver_id);
create index if not exists battle_challenges_status_idx on battle_challenges(status);
create index if not exists battle_matches_player_one_id_idx on battle_matches(player_one_id);
create index if not exists battle_matches_player_two_id_idx on battle_matches(player_two_id);
create index if not exists battle_matches_status_idx on battle_matches(status);
create index if not exists battle_matches_mode_idx on battle_matches(mode);
create index if not exists battle_match_actions_match_id_idx on battle_match_actions(match_id);

create or replace function submit_battle_action(
  p_match_id uuid,
  p_action_type text,
  p_action_payload jsonb,
  p_next_game_state jsonb,
  p_next_turn_user_id uuid,
  p_winner_id uuid default null
)
returns battle_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match battle_matches%rowtype;
  v_actor_id uuid := auth.uid();
  v_turn_number integer;
  v_updated_match battle_matches%rowtype;
begin
  if v_actor_id is null then
    raise exception 'You need to be logged in to submit a battle action.';
  end if;

  select *
  into v_match
  from battle_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Battle match was not found.';
  end if;

  if v_actor_id <> v_match.player_one_id and v_actor_id <> v_match.player_two_id then
    raise exception 'You are not part of this battle match.';
  end if;

  if v_match.status <> 'active' then
    raise exception 'This battle match is not active.';
  end if;

  if p_action_type <> 'forfeit' and v_match.mode = 'human' and v_match.current_turn_user_id <> v_actor_id then
    raise exception 'It is not your turn.';
  end if;

  if p_action_type <> 'forfeit' and v_match.mode = 'ai_friend_deck' then
    if v_actor_id <> v_match.player_one_id then
      raise exception 'Only player one can submit AI friend-deck match actions.';
    end if;

    if p_action_type like 'ai_%' then
      if v_match.ai_controlled_user_id is distinct from v_match.player_two_id then
        raise exception 'This match does not have a valid AI-controlled player.';
      end if;

      if v_match.current_turn_user_id is distinct from v_match.player_two_id then
        raise exception 'It is not the AI player turn.';
      end if;
    elsif v_match.current_turn_user_id <> v_actor_id then
      raise exception 'It is not your turn.';
    end if;
  end if;

  v_turn_number := coalesce((p_next_game_state ->> 'turnNumber')::integer, v_match.turn_number);

  insert into battle_match_actions (
    match_id,
    actor_id,
    action_type,
    action_payload
  ) values (
    p_match_id,
    v_actor_id,
    p_action_type,
    coalesce(p_action_payload, '{}'::jsonb)
  );

  update battle_matches
  set
    game_state = coalesce(p_next_game_state, '{}'::jsonb),
    current_turn_user_id = case when p_winner_id is null then p_next_turn_user_id else null end,
    winner_id = p_winner_id,
    status = case when p_winner_id is null then 'active' else 'completed' end,
    last_action = jsonb_build_object(
      'type', p_action_type,
      'actorId', v_actor_id,
      'payload', coalesce(p_action_payload, '{}'::jsonb),
      'createdAt', now()
    ),
    turn_number = v_turn_number,
    updated_at = now()
  where id = p_match_id
  returning *
  into v_updated_match;

  return v_updated_match;
end;
$$;

grant execute on function submit_battle_action(uuid, text, jsonb, jsonb, uuid, uuid) to authenticated;

-- AI friend-deck battles need the challenger to load a friend's saved deck.
-- If deck privacy is added later, include it in this policy.
do $$
begin
  if to_regclass('public.battle_decks') is not null and to_regclass('public.friendships') is not null then
    execute 'drop policy if exists "Friends can select battle decks" on public.battle_decks';
    execute '
      create policy "Friends can select battle decks"
      on public.battle_decks
      for select
      using (
        visibility = ''public''
        or exists (
          select 1
          from public.friendships
          where friendships.user_id = auth.uid()
            and friendships.friend_id = battle_decks.user_id
            and battle_decks.visibility = ''friends''
        )
      )
    ';
  end if;
end $$;
