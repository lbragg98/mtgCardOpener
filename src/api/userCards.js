// Supabase collection API: logged-in users store one row per owned physical card copy.
import { supabase } from '../lib/supabaseClient.js';
import { normalizeFoilTreatment } from '../utils/foilTypes.js';
import { assertCanRecycleCard, getRecycleShardValue } from '../utils/recycleValue.js';
import { addCloudPackShards, getCloudPackShards } from './packShards.js';

const DUPLICATE_SHARD_REWARD = 100;
const USER_CARDS_PAGE_SIZE = 1000;

function arrayValue(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function objectValue(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function getFullScryfallData(card) {
  if (card?.full_scryfall_data && typeof card.full_scryfall_data === 'object') return card.full_scryfall_data;
  if (card?.raw && typeof card.raw === 'object') return card.raw;
  return objectValue(card);
}

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

function getDuplicateCardKey(card) {
  return `${card.id || card.scryfall_id}-${Boolean(card.isFoil ?? card.is_foil) ? 'foil' : 'nonfoil'}`;
}

export function calculateDuplicateRewardsForBatch(existingCollection, newCards) {
  const ownedCounts = new Map();

  existingCollection.forEach((card) => {
    const key = getDuplicateCardKey(card);
    ownedCounts.set(key, (ownedCounts.get(key) || 0) + 1);
  });

  let duplicateCount = 0;
  const cardsWithDuplicateFlags = newCards.map((card) => {
    const key = getDuplicateCardKey(card);
    const ownedCount = ownedCounts.get(key) || 0;
    const isDuplicate = ownedCount > 0;

    ownedCounts.set(key, ownedCount + 1);

    if (isDuplicate) {
      duplicateCount += 1;
    }

    return {
      ...card,
      isDuplicatePull: isDuplicate,
    };
  });

  return {
    cardsWithDuplicateFlags,
    duplicateCount,
    shardsAwarded: duplicateCount * DUPLICATE_SHARD_REWARD,
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use cloud collection storage.');
  }

  return data.user.id;
}

export function normalizeUserCardRow(row) {
  // Rows are expanded back into the same shape pack opening, collection, and battle expect.
  const prices = row.prices || {};
  const isFoil = Boolean(row.is_foil);
  const fullScryfallData = objectValue(row.full_scryfall_data);

  return {
    ...row,
    collectionId: row.id,
    userCardId: row.id,
    user_id: row.user_id,
    userId: row.user_id,
    id: row.scryfall_id,
    scryfallId: row.scryfall_id,
    name: row.name,
    set: row.set_code,
    set_name: row.set_name,
    collector_number: row.collector_number,
    rarity: row.rarity,
    imageUrl: row.image_url,
    image: row.image_url,
    image_uris: fullScryfallData.image_uris || null,
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
    type_line: row.type_line || fullScryfallData.type_line || '',
    oracle_text: row.oracle_text || fullScryfallData.oracle_text || '',
    mana_cost: row.mana_cost || fullScryfallData.mana_cost || '',
    cmc: Number(row.cmc ?? fullScryfallData.cmc ?? fullScryfallData.mana_value ?? 0),
    mana_value: Number(row.cmc ?? fullScryfallData.mana_value ?? fullScryfallData.cmc ?? 0),
    power: row.power || fullScryfallData.power || null,
    toughness: row.toughness || fullScryfallData.toughness || null,
    colors: arrayValue(row.colors, arrayValue(fullScryfallData.colors)),
    color_identity: arrayValue(row.color_identity, arrayValue(fullScryfallData.color_identity)),
    keywords: arrayValue(row.keywords, arrayValue(fullScryfallData.keywords)),
    card_faces: arrayValue(row.card_faces, arrayValue(fullScryfallData.card_faces)),
    legalities: objectValue(row.legalities, objectValue(fullScryfallData.legalities)),
    layout: row.layout || fullScryfallData.layout || null,
    full_scryfall_data: fullScryfallData,
    openedAt: row.opened_at || row.created_at,
    createdAt: row.created_at,
  };
}

function cardToUserCardRow(card, userId, sourcePackId) {
  // Saving keeps battle-relevant Scryfall fields so old cards do not collapse into generic data later.
  const openedAt = card.openedAt || new Date().toISOString();
  const prices = card.prices || {};
  const fullScryfallData = getFullScryfallData(card);
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
    type_line: card.type_line || card.typeLine || fullScryfallData.type_line || null,
    oracle_text: card.oracle_text || card.oracleText || fullScryfallData.oracle_text || null,
    mana_cost: card.mana_cost || card.manaCost || fullScryfallData.mana_cost || null,
    cmc: Number(card.cmc ?? card.mana_value ?? fullScryfallData.cmc ?? fullScryfallData.mana_value ?? 0),
    power: card.power || fullScryfallData.power || null,
    toughness: card.toughness || fullScryfallData.toughness || null,
    colors: arrayValue(card.colors, arrayValue(fullScryfallData.colors)),
    color_identity: arrayValue(card.color_identity || card.colorIdentity, arrayValue(fullScryfallData.color_identity)),
    keywords: arrayValue(card.keywords, arrayValue(fullScryfallData.keywords)),
    card_faces: arrayValue(card.card_faces || card.cardFaces, arrayValue(fullScryfallData.card_faces)),
    legalities: objectValue(card.legalities, objectValue(fullScryfallData.legalities)),
    layout: card.layout || fullScryfallData.layout || null,
    full_scryfall_data: fullScryfallData,
    opened_at: openedAt,
  };

  if (sourcePackId || card.sourcePackId) {
    row.source_pack_id = sourcePackId || card.sourcePackId;
  }

  return row;
}

export async function getMyCards() {
  const userId = await getCurrentUserId();

  return getUserCardsForUser(userId);
}

export async function getUserCardsForUser(userId) {
  // Supabase range queries avoid the default 1,000-row ceiling for large collections.
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + USER_CARDS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message || 'Unable to load that collection.');
    }

    rows.push(...(data || []));

    if (!data || data.length < USER_CARDS_PAGE_SIZE) {
      break;
    }

    from += USER_CARDS_PAGE_SIZE;
  }

  return rows.map(normalizeUserCardRow);
}

export async function saveOpenedCards(cards, sourcePackId, options = {}) {
  // Duplicate rewards are calculated before insert so every opened copy is still saved.
  const userId = await getCurrentUserId();
  const existingCards = options.skipDuplicateRewards ? [] : await getMyCards();
  const openedAt = new Date().toISOString();
  const rowsToSave = cards
    .filter(isRealSaveableCard)
    .map((card) => cardToUserCardRow({ ...card, openedAt: card.openedAt || openedAt }, userId, sourcePackId));
  const duplicateRewards = options.skipDuplicateRewards
    ? { duplicateCount: 0, shardsAwarded: 0, cardsWithDuplicateFlags: rowsToSave }
    : calculateDuplicateRewardsForBatch(existingCards, rowsToSave);

  if (!rowsToSave.length) {
    return {
      savedCards: [],
      duplicateCount: 0,
      shardsAwarded: 0,
      newShardBalance: await getCloudPackShards(),
    };
  }

  const rowsWithDuplicateFlags = duplicateRewards.cardsWithDuplicateFlags;
  const rowsToInsert = rowsWithDuplicateFlags.map(({ isDuplicatePull, ...row }) => row);
  const { data, error } = await supabase.from('user_cards').insert(rowsToInsert).select('*');

  if (error) {
    throw new Error(error.message || 'Unable to save cards to your cloud collection.');
  }

  const shardsAwarded = duplicateRewards.shardsAwarded;
  const newShardBalance = shardsAwarded > 0 ? await addCloudPackShards(shardsAwarded) : await getCloudPackShards();
  window.dispatchEvent(new Event('collectionUpdated'));

  return {
    savedCards: (data || []).map((row, index) => ({
      ...normalizeUserCardRow(row),
      isDuplicatePull: Boolean(rowsWithDuplicateFlags[index]?.isDuplicatePull),
    })),
    duplicateCount: duplicateRewards.duplicateCount,
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
  // Recycling deletes only the selected collection copies, then awards dynamic Pack Shards.
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

  const newShardBalance = await addCloudPackShards(shardsAwarded);
  window.dispatchEvent(new Event('packShardsUpdated'));
  window.dispatchEvent(new Event('collectionUpdated'));

  return {
    recycledCards,
    recycledCount: recycledCards.length,
    shardsAwarded,
    newShardBalance,
  };
}
