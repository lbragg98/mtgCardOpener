import { supabase } from '../lib/supabaseClient.js';
import { BINDER_CATALOG, getCatalogBinderById } from '../utils/binderCatalog.js';
import { getCardPrice } from '../utils/cardPricing.js';
import { getPackShards, spendPackShards } from '../utils/collectionStorage.js';
import { normalizeUserCardRow } from './userCards.js';

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use cloud binders.');
  }

  return data.user.id;
}

function normalizeOwnedBinder(row, cards = []) {
  const catalogBinder = getCatalogBinderById(row.binder_id);

  return {
    ...catalogBinder,
    catalogBinder,
    ownedBinderId: row.id,
    id: row.id,
    binderId: row.binder_id,
    userId: row.user_id,
    purchasedAt: row.purchased_at,
    createdAt: row.created_at,
    equippedClaspId: row.equipped_clasp_id || '',
    equippedPageStyleId: row.equipped_page_style_id || '',
    equippedSlotFrameId: row.equipped_slot_frame_id || '',
    equippedAuraId: row.equipped_aura_id || '',
    cards: cards.map((card) => card.collectionId || card.userCardId || card.id),
    binderCards: cards,
  };
}

async function getBinderCardRows(ownedBinderId, userId) {
  const { data, error } = await supabase
    .from('binder_cards')
    .select('*')
    .eq('owned_binder_id', ownedBinderId)
    .eq('user_id', userId)
    .order('slot_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load binder cards.');
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
    throw new Error(error.message || 'Unable to load cards for this binder.');
  }

  return (data || []).map(normalizeUserCardRow);
}

export async function getBinderCards(ownedBinderId) {
  const userId = await getCurrentUserId();
  const binderRows = await getBinderCardRows(ownedBinderId, userId);
  const userCards = await getUserCardsByIds(
    binderRows.map((row) => row.user_card_id),
    userId,
  );
  const cardsById = new Map(userCards.map((card) => [card.userCardId || card.collectionId, card]));

  return binderRows
    .map((row) => {
      const card = cardsById.get(row.user_card_id);

      return card
        ? {
            ...card,
            binderCardId: row.id,
            slotIndex: row.slot_index,
          }
        : null;
    })
    .filter(Boolean);
}

export async function getMyOwnedBinders() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('owned_binders')
    .select('*')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load your binders.');
  }

  const binders = await Promise.all(
    (data || []).map(async (row) => normalizeOwnedBinder(row, await getBinderCards(row.id))),
  );

  return binders.filter((binder) => binder.catalogBinder);
}

export async function getOwnedBinderById(ownedBinderId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('owned_binders')
    .select('*')
    .eq('id', ownedBinderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load that binder.');
  }

  return data ? normalizeOwnedBinder(data, await getBinderCards(data.id)) : null;
}

export async function purchaseBinder(binderId) {
  const userId = await getCurrentUserId();
  const catalogBinder = getCatalogBinderById(binderId);

  if (!catalogBinder) {
    throw new Error('Binder not found.');
  }

  const { data: existingBinder, error: existingError } = await supabase
    .from('owned_binders')
    .select('*')
    .eq('user_id', userId)
    .eq('binder_id', binderId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Unable to check owned binders.');
  }

  if (existingBinder) {
    throw new Error('You already own this binder.');
  }

  const currentShards = getPackShards();

  if (currentShards < catalogBinder.price) {
    throw new Error(`Need ${(catalogBinder.price - currentShards).toLocaleString()} more Pack Shards.`);
  }

  if (!spendPackShards(catalogBinder.price)) {
    throw new Error('Not enough Pack Shards.');
  }

  const { data, error } = await supabase
    .from('owned_binders')
    .insert({
      user_id: userId,
      binder_id: binderId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to purchase binder.');
  }

  const binder = normalizeOwnedBinder(data);
  window.dispatchEvent(new Event('packShardsUpdated'));
  window.dispatchEvent(new Event('bindersUpdated'));

  return {
    binder,
    catalogBinder,
    newShardBalance: getPackShards(),
  };
}

export async function addCardsToBinder(ownedBinderId, userCardIds) {
  const userId = await getCurrentUserId();
  const ownedBinder = await getOwnedBinderById(ownedBinderId);

  if (!ownedBinder?.catalogBinder) {
    throw new Error('Binder not found.');
  }

  const uniqueUserCardIds = [...new Set(userCardIds)].filter(Boolean);
  const existingRows = await getBinderCardRows(ownedBinderId, userId);
  const existingIds = new Set(existingRows.map((row) => row.user_card_id));
  const newUserCardIds = uniqueUserCardIds.filter((userCardId) => !existingIds.has(userCardId));

  if (!newUserCardIds.length) {
    return getOwnedBinderById(ownedBinderId);
  }

  const availableSlots = ownedBinder.catalogBinder.capacity - existingRows.length;

  if (availableSlots <= 0) {
    throw new Error('This binder is full.');
  }

  if (newUserCardIds.length > availableSlots) {
    throw new Error(`Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} available in this binder.`);
  }

  const rows = newUserCardIds.map((userCardId, index) => ({
    owned_binder_id: ownedBinderId,
    user_card_id: userCardId,
    user_id: userId,
    slot_index: existingRows.length + index,
  }));

  const { error } = await supabase.from('binder_cards').insert(rows);

  if (error) {
    throw new Error(error.message || 'Unable to add cards to binder.');
  }

  window.dispatchEvent(new Event('bindersUpdated'));

  return getOwnedBinderById(ownedBinderId);
}

export async function removeCardFromBinder(ownedBinderId, userCardId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('owned_binder_id', ownedBinderId)
    .eq('user_card_id', userCardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to remove card from binder.');
  }

  window.dispatchEvent(new Event('bindersUpdated'));

  return getOwnedBinderById(ownedBinderId);
}

export async function removeBinderCard(binderCardId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('binder_cards').delete().eq('id', binderCardId).eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to remove card from binder.');
  }

  window.dispatchEvent(new Event('bindersUpdated'));
}

export async function getBinderValue(ownedBinderId) {
  const cards = await getBinderCards(ownedBinderId);

  return cards.reduce((total, card) => total + getCardPrice(card), 0);
}

export async function updateBinderCosmetics(ownedBinderId, cosmetics = {}) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('owned_binders')
    .update({
      equipped_clasp_id: cosmetics.equippedClaspId || null,
      equipped_page_style_id: cosmetics.equippedPageStyleId || null,
      equipped_slot_frame_id: cosmetics.equippedSlotFrameId || null,
      equipped_aura_id: cosmetics.equippedAuraId || null,
    })
    .eq('id', ownedBinderId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to update binder cosmetics.');
  }

  window.dispatchEvent(new Event('bindersUpdated'));

  return normalizeOwnedBinder(data, await getBinderCards(data.id));
}

export function isBinderOwned(binderId, ownedBinders = []) {
  return ownedBinders.some((binder) => binder.binderId === binderId);
}

export function getOwnedBinderId(binderId, ownedBinders = []) {
  return ownedBinders.find((binder) => binder.binderId === binderId)?.ownedBinderId;
}

export { BINDER_CATALOG };
