import { supabase } from '../lib/supabaseClient.js';
import { addPackShards, getPackShards } from '../utils/collectionStorage.js';
import { normalizeFoilTreatment } from '../utils/foilTypes.js';
import { assertCanRecycleCard, getRecycleShardValue } from '../utils/recycleValue.js';

const DUPLICATE_SHARD_REWARD = 100;

function isRealSaveableCard(card) {
  const typeLine = card?.type_line?.toLowerCase() || '';

  return Boolean(
    card?.id &&
      card?.name &&
      (card?.image || card?.imageUrl) &&
      card?.set &&
      card?.collector_number &&
      !typeLine.includes('token') &&
      !typeLine.includes('art series'),
  );
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use cloud collection storage.');
  }

  return data.user.id;
}

export function normalizeUserCardRow(row) {
  const prices = row.prices || {};
  const isFoil = Boolean(row.is_foil);

  return {
    collectionId: row.id,
    userCardId: row.id,
    user_id: row.user_id,
    userId: row.user_id,
    id: row.scryfall_id,
    name: row.name,
    set: row.set_code,
    set_name: row.set_name,
    collector_number: row.collector_number,
    rarity: row.rarity,
    imageUrl: row.image_url,
    image: row.image_url,
    prices,
    usd: prices.usd ?? null,
    usd_foil: prices.usd_foil ?? null,
    usd_etched: prices.usd_etched ?? null,
    eur: prices.eur ?? null,
    eur_foil: prices.eur_foil ?? null,
    tix: prices.tix ?? null,
    isFoil,
    foilTreatment: normalizeFoilTreatment({ isFoil, foilTreatment: row.foil_treatment }),
    isCollectorExclusive: Boolean(row.is_collector_exclusive),
    isOneOfOne: Boolean(row.is_one_of_one),
    specialPullType: row.special_pull_type || null,
    openedAt: row.opened_at || row.created_at,
    createdAt: row.created_at,
  };
}

function cardToUserCardRow(card, userId, sourcePackId) {
  const openedAt = card.openedAt || new Date().toISOString();
  const prices = card.prices || {};
  const row = {
    user_id: userId,
    scryfall_id: card.id,
    name: card.name,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    image_url: card.imageUrl || card.image,
    is_foil: Boolean(card.isFoil),
    foil_treatment: normalizeFoilTreatment(card),
    is_collector_exclusive: Boolean(card.isCollectorExclusive),
    is_one_of_one: Boolean(card.isOneOfOne),
    special_pull_type: card.specialPullType || null,
    prices,
    opened_at: openedAt,
  };

  if (sourcePackId) {
    row.source_pack_id = sourcePackId;
  }

  return row;
}

export async function getMyCards() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load your cloud collection.');
  }

  return (data || []).map(normalizeUserCardRow);
}

export async function getUserCardsForUser(userId) {
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load that collection.');
  }

  return (data || []).map(normalizeUserCardRow);
}

export async function saveOpenedCards(cards, sourcePackId, options = {}) {
  const userId = await getCurrentUserId();
  const existingCards = options.skipDuplicateRewards ? [] : await getMyCards();
  const openedAt = new Date().toISOString();
  const rowsToSave = cards
    .filter(isRealSaveableCard)
    .map((card) => cardToUserCardRow({ ...card, openedAt: card.openedAt || openedAt }, userId, sourcePackId));
  const duplicateCount = options.skipDuplicateRewards
    ? 0
    : rowsToSave.reduce((count, row) => {
      const isDuplicate = existingCards.some(
        (card) => card.id === row.scryfall_id && Boolean(card.isFoil) === Boolean(row.is_foil),
      );

      return isDuplicate ? count + 1 : count;
    }, 0);

  if (!rowsToSave.length) {
    return {
      savedCards: [],
      duplicateCount: 0,
      shardsAwarded: 0,
      newShardBalance: getPackShards(),
    };
  }

  const { data, error } = await supabase.from('user_cards').insert(rowsToSave).select('*');

  if (error) {
    throw new Error(error.message || 'Unable to save cards to your cloud collection.');
  }

  const shardsAwarded = duplicateCount * DUPLICATE_SHARD_REWARD;
  const newShardBalance = shardsAwarded > 0 ? addPackShards(shardsAwarded) : getPackShards();
  window.dispatchEvent(new Event('collectionUpdated'));

  return {
    savedCards: (data || []).map(normalizeUserCardRow),
    duplicateCount,
    shardsAwarded,
    newShardBalance,
  };
}

export async function deleteUserCard(userCardId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('user_cards').delete().eq('id', userCardId).eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to delete that card.');
  }

  window.dispatchEvent(new Event('collectionUpdated'));
}

export async function recycleUserCard(userCardId) {
  const result = await recycleUserCards([userCardId]);

  return {
    recycledCard: result.recycledCards[0],
    shardsAwarded: result.shardsAwarded,
    newShardBalance: result.newShardBalance,
  };
}

export async function getCardByUserCardId(userCardId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('id', userCardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load that card.');
  }

  if (!data) {
    throw new Error('No matching card was found.');
  }

  return normalizeUserCardRow(data);
}

export async function recycleUserCards(userCardIds) {
  const userId = await getCurrentUserId();
  const uniqueUserCardIds = [...new Set(userCardIds)].filter(Boolean);

  if (!uniqueUserCardIds.length) {
    throw new Error('No cards were selected to recycle.');
  }

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .in('id', uniqueUserCardIds);

  if (error) {
    throw new Error(error.message || 'Unable to load selected cards.');
  }

  const recycledCards = (data || []).map(normalizeUserCardRow);

  if (recycledCards.length !== uniqueUserCardIds.length) {
    throw new Error('One or more selected cards could not be found.');
  }

  recycledCards.forEach(assertCanRecycleCard);

  const shardsAwarded = recycledCards.reduce(
    (total, card) => total + getRecycleShardValue(card),
    0,
  );
  const { error: deleteError } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .in('id', uniqueUserCardIds);

  if (deleteError) {
    throw new Error(deleteError.message || 'Unable to recycle selected cards.');
  }

  const newShardBalance = addPackShards(shardsAwarded);
  window.dispatchEvent(new Event('packShardsUpdated'));
  window.dispatchEvent(new Event('collectionUpdated'));

  return {
    recycledCards,
    recycledCount: recycledCards.length,
    shardsAwarded,
    newShardBalance,
  };
}
