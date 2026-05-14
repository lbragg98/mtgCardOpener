const BATTLE_DECK_KEY = 'binderBattleDeck';

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
