import { supabase } from '../lib/supabaseClient.js';
import { addPackShards, getPackShards, spendPackShards } from '../utils/collectionStorage.js';
import { getShopItemById, SHOP_CATEGORIES } from '../utils/shopCatalog.js';
import { normalizeUserCardRow } from './userCards.js';

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use display cases.');
  }

  return data.user.id;
}

function normalizeDisplayCase(row, cards = []) {
  const catalogItem = getShopItemById(row.display_case_id);

  return {
    ...catalogItem,
    catalogItem,
    id: row.id,
    displayCaseInstanceId: row.id,
    displayCaseId: row.display_case_id,
    userId: row.user_id,
    createdAt: row.created_at,
    capacity: catalogItem?.capacity || 3,
    cards: cards.map((card) => card.userCardId || card.collectionId),
    displayCards: cards,
  };
}

async function getDisplayCaseCardRows(displayCaseInstanceId, userId) {
  const { data, error } = await supabase
    .from('display_case_cards')
    .select('*')
    .eq('display_case_instance_id', displayCaseInstanceId)
    .eq('user_id', userId)
    .order('slot_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load display case cards.');
  }

  return data || [];
}

async function getUserCardsByIds(userCardIds, userId) {
  const uniqueIds = [...new Set(userCardIds)].filter(Boolean);

  if (!uniqueIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .in('id', uniqueIds);

  if (error) {
    throw new Error(error.message || 'Unable to load cards for this display case.');
  }

  return (data || []).map(normalizeUserCardRow);
}

export async function getDisplayCaseCards(displayCaseInstanceId) {
  const userId = await getCurrentUserId();
  const rows = await getDisplayCaseCardRows(displayCaseInstanceId, userId);
  const userCards = await getUserCardsByIds(rows.map((row) => row.user_card_id), userId);
  const cardsById = new Map(userCards.map((card) => [card.userCardId || card.collectionId, card]));

  return rows
    .map((row) => {
      const card = cardsById.get(row.user_card_id);

      return card
        ? {
            ...card,
            displayCaseCardId: row.id,
            slotIndex: row.slot_index,
          }
        : null;
    })
    .filter(Boolean);
}

export async function getMyDisplayCases() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('display_cases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load display cases.');
  }

  const cases = await Promise.all(
    (data || []).map(async (row) => normalizeDisplayCase(row, await getDisplayCaseCards(row.id))),
  );

  return cases.filter((displayCase) => displayCase.catalogItem);
}

export async function purchaseDisplayCase(displayCaseId) {
  const userId = await getCurrentUserId();
  const catalogItem = getShopItemById(displayCaseId);

  if (!catalogItem || catalogItem.category !== SHOP_CATEGORIES.DISPLAY_CASES) {
    throw new Error('Display case not found.');
  }

  const currentShards = getPackShards();

  if (currentShards < catalogItem.price) {
    throw new Error(`Need ${(catalogItem.price - currentShards).toLocaleString()} more Pack Shards.`);
  }

  if (!spendPackShards(catalogItem.price)) {
    throw new Error('Not enough Pack Shards.');
  }

  const { data, error } = await supabase
    .from('display_cases')
    .insert({
      user_id: userId,
      display_case_id: displayCaseId,
    })
    .select('*')
    .single();

  if (error) {
    addPackShards(catalogItem.price);
    throw new Error(error.message || 'Unable to purchase display case.');
  }

  window.dispatchEvent(new Event('packShardsUpdated'));
  window.dispatchEvent(new Event('displayCasesUpdated'));

  return {
    displayCase: normalizeDisplayCase(data),
    catalogItem,
    newShardBalance: getPackShards(),
  };
}

export async function addCardsToDisplayCase(displayCaseInstanceId, userCardIds) {
  const userId = await getCurrentUserId();
  const displayCases = await getMyDisplayCases();
  const displayCase = displayCases.find((item) => item.displayCaseInstanceId === displayCaseInstanceId);

  if (!displayCase) {
    throw new Error('Display case not found.');
  }

  const uniqueUserCardIds = [...new Set(userCardIds)].filter(Boolean);
  const existingRows = await getDisplayCaseCardRows(displayCaseInstanceId, userId);
  const existingIds = new Set(existingRows.map((row) => row.user_card_id));
  const newUserCardIds = uniqueUserCardIds.filter((userCardId) => !existingIds.has(userCardId));

  if (!newUserCardIds.length) {
    return displayCase;
  }

  const availableSlots = displayCase.capacity - existingRows.length;

  if (availableSlots <= 0) {
    throw new Error('This display case is full.');
  }

  if (newUserCardIds.length > availableSlots) {
    throw new Error(`Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} available in this display case.`);
  }

  const rows = newUserCardIds.map((userCardId, index) => ({
    display_case_instance_id: displayCaseInstanceId,
    user_card_id: userCardId,
    user_id: userId,
    slot_index: existingRows.length + index,
  }));

  const { error } = await supabase.from('display_case_cards').insert(rows);

  if (error) {
    throw new Error(error.message || 'Unable to add cards to display case.');
  }

  window.dispatchEvent(new Event('displayCasesUpdated'));
  return getMyDisplayCases();
}

export async function removeCardFromDisplayCase(displayCaseInstanceId, userCardId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('display_case_cards')
    .delete()
    .eq('display_case_instance_id', displayCaseInstanceId)
    .eq('user_card_id', userCardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to remove card from display case.');
  }

  window.dispatchEvent(new Event('displayCasesUpdated'));
}
