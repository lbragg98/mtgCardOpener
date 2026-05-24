alter table public.user_cards
  add column if not exists booster_type text null,
  add column if not exists pack_number integer null,
  add column if not exists bulk_opening_id uuid null;
