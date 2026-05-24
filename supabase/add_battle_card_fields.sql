alter table user_cards
add column if not exists type_line text,
add column if not exists oracle_text text,
add column if not exists mana_cost text,
add column if not exists cmc numeric,
add column if not exists power text,
add column if not exists toughness text,
add column if not exists colors jsonb default '[]'::jsonb,
add column if not exists color_identity jsonb default '[]'::jsonb,
add column if not exists keywords jsonb default '[]'::jsonb,
add column if not exists card_faces jsonb default '[]'::jsonb,
add column if not exists legalities jsonb default '{}'::jsonb,
add column if not exists layout text,
add column if not exists full_scryfall_data jsonb default '{}'::jsonb;
