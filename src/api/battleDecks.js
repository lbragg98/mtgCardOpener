import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { getSavedBattleDeck, saveBattleDeck as saveLocalBattleDeck } from '../utils/battleDeckStorage.js';

const DEFAULT_DECK_NAME = 'Binder Battle Deck';

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
  };
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

export async function saveBattleDeckToCloud(cards, name = DEFAULT_DECK_NAME, deckId = null) {
  const userId = await getCurrentUserId();
  const deckCards = Array.isArray(cards) ? cards.slice(0, 20) : [];
  const payload = {
    cards: deckCards,
    name: name || DEFAULT_DECK_NAME,
    updated_at: new Date().toISOString(),
    user_id: userId,
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
    return await saveBattleDeckToCloud(cards, options.name, options.deckId);
  } catch (error) {
    const localCards = saveLocalBattleDeck(cards);

    return {
      cards: localCards,
      error,
      id: null,
      isLocalFallback: true,
      name: options.name || DEFAULT_DECK_NAME,
    };
  }
}

export function getCachedBattleDeck() {
  return {
    cards: getSavedBattleDeck(),
    id: null,
    isLocalFallback: true,
    name: DEFAULT_DECK_NAME,
  };
}
