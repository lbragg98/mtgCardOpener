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
  const typeLine = (card?.type_line || card?.typeLine || card?.full_scryfall_data?.type_line || '').toLowerCase();

  return Boolean(
    (card?.id || card?.scryfall_id) &&
      card?.name &&
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

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('You must be logged in to save cards.');
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
    boosterType: row.booster_type || null,
    packNumber: row.pack_number || null,
    bulkOpeningId: row.bulk_opening_id || null,
    sourcePackId: row.source_pack_id || null,
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

function getCardImageUrl(card, fullScryfallData = {}) {
  return (
    card.imageUrl ||
    card.image_url ||
    card.image ||
    card.image_uris?.normal ||
    card.image_uris?.large ||
    card.card_faces?.[0]?.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.large ||
    fullScryfallData.image_uris?.normal ||
    fullScryfallData.image_uris?.large ||
    fullScryfallData.card_faces?.[0]?.image_uris?.normal ||
    fullScryfallData.card_faces?.[0]?.image_uris?.large ||
    null
  );
}

function parseSaveOpenedCardsArguments(sourcePackIdOrOptions, maybeOptions) {
  if (
    sourcePackIdOrOptions &&
    typeof sourcePackIdOrOptions === 'object' &&
    !Array.isArray(sourcePackIdOrOptions)
  ) {
    return { sourcePackId: sourcePackIdOrOptions.sourcePackId || null, options: sourcePackIdOrOptions };
  }

  return {
    sourcePackId: sourcePackIdOrOptions || maybeOptions?.sourcePackId || null,
    options: maybeOptions || {},
  };
}

export function normalizeCardForUserCardsInsert(card, userId, options = {}) {
  const openedAt = card.openedAt || card.opened_at || new Date().toISOString();
  const prices = objectValue(card.prices);
  const fullScryfallData = getFullScryfallData(card);
  const row = {
    user_id: userId,
    scryfall_id: card.id || card.scryfall_id,
    name: card.name || 'Unknown Card',
    set_code: card.set || card.set_code || options.setCode || null,
    set_name: card.set_name || card.setName || options.setName || null,
    collector_number: card.collector_number || null,
    rarity: card.rarity || null,
    image_url: getCardImageUrl(card, fullScryfallData),
    is_foil: Boolean(card.isFoil ?? card.is_foil),
    foil_treatment: card.foilTreatment || card.foil_treatment || normalizeFoilTreatment(card) || 'none',
    is_collector_exclusive: Boolean(card.isCollectorExclusive ?? card.is_collector_exclusive),
    is_one_of_one: Boolean(card.isOneOfOne ?? card.is_one_of_one),
    special_pull_type: card.specialPullType || card.special_pull_type || null,
    prices,
    opened_at: openedAt,
  };

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

export async function saveOpenedCards(cards, sourcePackIdOrOptions, maybeOptions = {}) {
  // Duplicate rewards are calculated before insert so every opened copy is still saved.
  if (!Array.isArray(cards)) {
    throw new Error('saveOpenedCards expected an array of cards.');
  }

  if (cards.length === 0) {
    throw new Error('No cards were provided to save.');
  }

  const { sourcePackId, options } = parseSaveOpenedCardsArguments(sourcePackIdOrOptions, maybeOptions);
  const userId = await getCurrentUserId();
  const existingCards = options.skipDuplicateRewards ? [] : await getMyCards();
  const openedAt = new Date().toISOString();
  const skippedCards = [];
  const rowsToSave = cards.filter(Boolean).reduce((rows, card) => {
    const row = normalizeCardForUserCardsInsert(
      { ...card, openedAt: card.openedAt || card.opened_at || openedAt },
      userId,
      { ...options, sourcePackId },
    );

    if (!row.scryfall_id || !row.name || !isRealSaveableCard(card)) {
      skippedCards.push(card);
      return rows;
    }

    rows.push(row);
    return rows;
  }, []);
  const duplicateRewards = options.skipDuplicateRewards
    ? { cardsWithDuplicateFlags: rowsToSave, duplicateCount: 0, shardsAwarded: 0 }
    : calculateDuplicateRewardsForBatch(existingCards, rowsToSave);

  if (!rowsToSave.length) {
    throw new Error('No valid cards were available to save.');
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
  const insertedRows = data || [];

  return {
    savedCards: insertedRows.map((row, index) => ({
      ...normalizeUserCardRow(row),
      isDuplicatePull: Boolean(rowsWithDuplicateFlags[index]?.isDuplicatePull),
    })),
    insertedRows,
    skippedCards,
    attemptedCount: rowsToInsert.length,
    insertedCount: insertedRows.length,
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
