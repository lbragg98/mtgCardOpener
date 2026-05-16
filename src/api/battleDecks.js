// Battle deck API: Supabase-backed saved decks with localStorage fallback for guest/offline use.
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { getBattleCardEffectSummary } from '../utils/battleCardMapper.js';
import {
  deleteBattleDeck as deleteLocalBattleDeck,
  getBattleDeckById as getLocalBattleDeckById,
  getMyBattleDecks as getLocalBattleDecks,
  getSavedBattleDeck,
  saveBattleDeck as saveActiveLocalBattleDeck,
  saveNamedBattleDeck,
  updateBattleDeck as updateLocalBattleDeck,
} from '../utils/battleDeckStorage.js';

const DEFAULT_DECK_NAME = 'New Battle Deck';
const VALID_VISIBILITIES = new Set(['private', 'friends', 'public']);

async function getCurrentUserId() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for cloud battle decks.');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use cloud battle decks.');
  }

  return data.user.id;
}

function normalizeVisibility(visibility = 'private') {
  return VALID_VISIBILITIES.has(visibility) ? visibility : 'private';
}

function normalizeBattleDeck(row) {
  return {
    cards: Array.isArray(row?.cards) ? row.cards : [],
    createdAt: row?.created_at || row?.createdAt,
    id: row?.id || null,
    isLocalFallback: Boolean(row?.isLocalFallback),
    name: row?.name || DEFAULT_DECK_NAME,
    updatedAt: row?.updated_at || row?.updatedAt,
    userId: row?.user_id || row?.userId,
    visibility: normalizeVisibility(row?.visibility),
  };
}

function trimDeckName(name) {
  return String(name || DEFAULT_DECK_NAME).trim().slice(0, 40) || DEFAULT_DECK_NAME;
}

export function serializeBattleDeckCard(card) {
  return {
    attack: card?.attack ?? card?.battleStats?.attack ?? 0,
    battleId: card?.battleId || null,
    collectionId: card?.collectionId || card?.userCardId || null,
    colorIdentity: card?.colorIdentity || [],
    colorName: card?.colorName || '',
    colorSignature: card?.colorSignature || '',
    colors: card?.colors || card?.colorIdentity || [],
    cost: card?.cost ?? card?.battleStats?.cost ?? 1,
    displayType: card?.displayType || '',
    effectSummary: card?.effectSummary || card?.effectText || card?.battleText || getBattleCardEffectSummary(card),
    effects: Array.isArray(card?.effects) ? card.effects : [],
    foilTreatment: card?.foilTreatment || card?.foil_treatment || null,
    health: card?.health ?? card?.maxHealth ?? card?.battleStats?.health ?? 1,
    imageUrl: card?.imageUrl || card?.image || '',
    isFoil: Boolean(card?.isFoil),
    keywords: Array.isArray(card?.keywords) ? card.keywords : [],
    name: card?.name || 'Unknown Card',
    originalPower: card?.originalPower || card?.power || null,
    originalToughness: card?.originalToughness || card?.toughness || null,
    primaryColor: card?.primaryColor || 'C',
    rarity: card?.rarity || 'common',
    role: card?.role || card?.mapping?.role || card?.type || 'colorFallbackSpell',
    category: card?.category || card?.mapping?.category || 'unknown',
    mapping: card?.mapping || {
      category: card?.category || 'unknown',
      confidence: 'medium',
      effectTags: [],
      reason: 'Saved deck card',
      role: card?.role || card?.type || 'colorFallbackSpell',
    },
    scryfallId: card?.scryfallId || card?.id || null,
    type: card?.type || 'genericSpell',
    userCardId: card?.userCardId || card?.collectionId || null,
  };
}

function serializeDeckCards(cards) {
  return Array.isArray(cards) ? cards.map(serializeBattleDeckCard) : [];
}

async function assertFriend(userId, friendUserId) {
  if (!friendUserId || userId === friendUserId) {
    throw new Error('Choose a friend to view battle decks.');
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', friendUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to verify friendship.');
  }

  if (!data) {
    throw new Error('You can only view battle decks shared by friends.');
  }
}

export async function getMyBattleDecks() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('battle_decks')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load battle decks.');
    }

    return (data || []).map(normalizeBattleDeck);
  } catch {
    return getLocalBattleDecks();
  }
}

export async function getBattleDeckById(deckId) {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('battle_decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load battle deck.');
    }

    return data ? normalizeBattleDeck(data) : null;
  } catch {
    return getLocalBattleDeckById(deckId);
  }
}

export async function getFriendBattleDecks(friendUserId) {
  const userId = await getCurrentUserId();
  await assertFriend(userId, friendUserId);

  const { data, error } = await supabase
    .from('battle_decks')
    .select('*')
    .eq('user_id', friendUserId)
    .in('visibility', ['friends', 'public'])
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load friend battle decks.');
  }

  return (data || []).map(normalizeBattleDeck);
}

export async function getLatestBattleDeck() {
  const decks = await getMyBattleDecks();
  return decks[0] || null;
}

export async function saveBattleDeck(input, options = {}) {
  const payload = Array.isArray(input)
    ? {
        cards: input,
        id: options.deckId || options.id,
        name: options.name,
        visibility: options.visibility,
      }
    : input || {};

  if (payload.id) {
    return updateBattleDeck(payload.id, payload);
  }

  const cards = serializeDeckCards(payload.cards);
  const name = trimDeckName(payload.name);
  const visibility = normalizeVisibility(payload.visibility);

  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('battle_decks')
      .insert({
        cards,
        name,
        updated_at: new Date().toISOString(),
        user_id: userId,
        visibility,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to save battle deck.');
    }

    const deck = normalizeBattleDeck(data);
    saveActiveLocalBattleDeck(deck.cards);
    window.dispatchEvent(new Event('battleDeckUpdated'));
    return deck;
  } catch (error) {
    const deck = saveNamedBattleDeck({ cards, name, visibility });
    saveActiveLocalBattleDeck(deck.cards);
    return { ...deck, error, isLocalFallback: true };
  }
}

export async function updateBattleDeck(deckId, updates = {}) {
  const cards = serializeDeckCards(updates.cards);
  const name = trimDeckName(updates.name);
  const visibility = normalizeVisibility(updates.visibility);

  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('battle_decks')
      .update({
        cards,
        name,
        updated_at: new Date().toISOString(),
        visibility,
      })
      .eq('id', deckId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to update battle deck.');
    }

    const deck = normalizeBattleDeck(data);
    saveActiveLocalBattleDeck(deck.cards);
    window.dispatchEvent(new Event('battleDeckUpdated'));
    return deck;
  } catch (error) {
    const deck = updateLocalBattleDeck(deckId, { cards, name, visibility });
    saveActiveLocalBattleDeck(deck.cards);
    return { ...deck, error, isLocalFallback: true };
  }
}

export async function deleteBattleDeck(deckId) {
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('battle_decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Unable to delete battle deck.');
    }
  } catch {
    deleteLocalBattleDeck(deckId);
    return;
  }

  deleteLocalBattleDeck(deckId);
  window.dispatchEvent(new Event('battleDeckUpdated'));
}

export function getCachedBattleDeck() {
  return {
    cards: getSavedBattleDeck(),
    id: null,
    isLocalFallback: true,
    name: DEFAULT_DECK_NAME,
    visibility: 'private',
  };
}
