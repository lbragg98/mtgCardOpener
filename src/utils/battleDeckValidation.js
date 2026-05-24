export function getDeckCardId(card) {
  return card?.userCardId || card?.collectionId || card?.battleId || card?.scryfallId || card?.id || card?.name;
}

export function getDeckStats(cards = []) {
  const safeCards = Array.isArray(cards) ? cards.filter(Boolean) : [];
  const totalCost = safeCards.reduce((total, card) => total + (card.cost || 1), 0);
  const creatureCount = safeCards.filter((card) => card.type === 'creature').length;
  const spellCount = safeCards.length - creatureCount;
  const colorCounts = safeCards.reduce((counts, card) => {
    const colors = Array.isArray(card.colors) && card.colors.length
      ? card.colors
      : Array.isArray(card.colorIdentity) && card.colorIdentity.length
        ? card.colorIdentity
        : [card.primaryColor || 'C'];

    colors.forEach((color) => {
      counts[color] = (counts[color] || 0) + 1;
    });

    return counts;
  }, {});

  return {
    averageCost: safeCards.length ? totalCost / safeCards.length : 0,
    cardCount: safeCards.length,
    colorCounts,
    creatureCount,
    spellCount,
  };
}

export function getMissingDeckCards(savedDeck, currentCollection = []) {
  const collectionIds = new Set(
    (currentCollection || [])
      .map(getDeckCardId)
      .filter(Boolean),
  );

  return (savedDeck?.cards || []).filter((card) => {
    const cardId = getDeckCardId(card);
    return cardId && !collectionIds.has(cardId);
  });
}

export function validateSavedDeck(savedDeck, currentCollection = []) {
  const missingCards = getMissingDeckCards(savedDeck, currentCollection);

  return {
    canBattle: (savedDeck?.cards || []).length === 20 && missingCards.length === 0,
    missingCards,
    stats: getDeckStats(savedDeck?.cards || []),
  };
}
