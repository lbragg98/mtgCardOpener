// Battle deck API: saved 20-card decks live in Supabase, with local fallback for resilience.
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { getSavedBattleDeck, saveBattleDeck as saveLocalBattleDeck } from '../utils/battleDeckStorage.js';

const DEFAULT_DECK_NAME = 'Binder Battle Deck';
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

function normalizeBattleDeck(row) {
  return {
    cards: Array.isArray(row.cards) ? row.cards : [],
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    userId: row.user_id,
    visibility: VALID_VISIBILITIES.has(row.visibility) ? row.visibility : 'private',
  };
}

function normalizeVisibility(visibility = 'private') {
  return VALID_VISIBILITIES.has(visibility) ? visibility : 'private';
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
}

export async function getFriendBattleDecks(friendUserId) {
  // Friend battles can only see decks explicitly shared as friends/public.
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
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_decks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load your saved battle deck.');
  }

  return data ? normalizeBattleDeck(data) : null;
}

export async function saveBattleDeckToCloud(cards, name = DEFAULT_DECK_NAME, deckId = null, visibility = 'private') {
  // Deck cards are stored as mapped battle-card JSON so play can start without re-querying Scryfall.
  const userId = await getCurrentUserId();
  const deckCards = Array.isArray(cards) ? cards.slice(0, 20) : [];
  const payload = {
    cards: deckCards,
    name: name || DEFAULT_DECK_NAME,
    updated_at: new Date().toISOString(),
    user_id: userId,
    visibility: normalizeVisibility(visibility),
  };

  const query = deckId
    ? supabase.from('battle_decks').update(payload).eq('id', deckId).eq('user_id', userId)
    : supabase.from('battle_decks').insert(payload);
  const { data, error } = await query.select('*').single();

  if (error) {
    throw new Error(error.message || 'Unable to save battle deck.');
  }

  const deck = normalizeBattleDeck(data);
  saveLocalBattleDeck(deck.cards);
  window.dispatchEvent(new Event('battleDeckUpdated'));

  return deck;
}

export async function saveBattleDeck(cards, options = {}) {
  try {
    return await saveBattleDeckToCloud(cards, options.name, options.deckId, options.visibility);
  } catch (error) {
    const localCards = saveLocalBattleDeck(cards);

    return {
      cards: localCards,
      error,
      id: null,
      isLocalFallback: true,
      name: options.name || DEFAULT_DECK_NAME,
      visibility: normalizeVisibility(options.visibility),
    };
  }
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
