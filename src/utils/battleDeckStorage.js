const BATTLE_DECK_KEY = 'binderBattleDeck';
const SAVED_DECKS_KEY = 'binderBattleSavedDecks';

function createLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDeck(deck) {
  const now = new Date().toISOString();

  return {
    cards: Array.isArray(deck?.cards) ? deck.cards : [],
    createdAt: deck?.createdAt || deck?.created_at || now,
    id: deck?.id || createLocalId(),
    isLocalFallback: true,
    name: String(deck?.name || 'New Battle Deck').trim() || 'New Battle Deck',
    updatedAt: deck?.updatedAt || deck?.updated_at || now,
    visibility: deck?.visibility || 'private',
  };
}

export function getSavedBattleDeck() {
  try {
    const savedDeck = localStorage.getItem(BATTLE_DECK_KEY);
    const parsedDeck = savedDeck ? JSON.parse(savedDeck) : [];

    return Array.isArray(parsedDeck)
      ? parsedDeck.filter((card) => (card?.userCardId || card?.collectionId) && card?.name)
      : [];
  } catch {
    return [];
  }
}

export function saveBattleDeck(cards) {
  const deck = Array.isArray(cards) ? cards.slice(0, 20) : [];

  localStorage.setItem(BATTLE_DECK_KEY, JSON.stringify(deck));
  window.dispatchEvent(new Event('battleDeckUpdated'));

  return deck;
}

export function hasSavedBattleDeck() {
  return getSavedBattleDeck().length === 20;
}

export function getMyBattleDecks() {
  try {
    const savedDecks = localStorage.getItem(SAVED_DECKS_KEY);
    const parsedDecks = savedDecks ? JSON.parse(savedDecks) : [];

    return Array.isArray(parsedDecks)
      ? parsedDecks.map(normalizeDeck).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function getBattleDeckById(deckId) {
  return getMyBattleDecks().find((deck) => deck.id === deckId) || null;
}

export function saveNamedBattleDeck({ id, name, cards = [], visibility = 'private' }) {
  const savedDecks = getMyBattleDecks();
  const now = new Date().toISOString();
  const existingDeck = id ? savedDecks.find((deck) => deck.id === id) : null;
  const nextDeck = normalizeDeck({
    cards,
    createdAt: existingDeck?.createdAt || now,
    id: existingDeck?.id || id || createLocalId(),
    name,
    updatedAt: now,
    visibility,
  });
  const nextDecks = existingDeck
    ? savedDecks.map((deck) => (deck.id === existingDeck.id ? nextDeck : deck))
    : [nextDeck, ...savedDecks];

  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(nextDecks));
  window.dispatchEvent(new Event('battleDeckUpdated'));

  return nextDeck;
}

export function updateBattleDeck(deckId, updates = {}) {
  return saveNamedBattleDeck({ ...updates, id: deckId });
}

export function deleteBattleDeck(deckId) {
  const nextDecks = getMyBattleDecks().filter((deck) => deck.id !== deckId);
  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(nextDecks));
  window.dispatchEvent(new Event('battleDeckUpdated'));
}
