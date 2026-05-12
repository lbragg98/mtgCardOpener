import { getCardPrice } from './cardPricing.js';
import { isOneOfOneRing } from './collectorExclusiveCards.js';
import { normalizeFoilTreatment } from './foilTypes.js';
import { getRecycleShardValue } from './recycleValue.js';

function getCardCopyId(card) {
  return card.userCardId || card.collectionId || card.id;
}

function getDuplicateKey(card) {
  return [
    card.id,
    Boolean(card.isFoil) ? 'foil' : 'nonfoil',
    normalizeFoilTreatment(card),
  ].join('|');
}

function sortByOldest(cards) {
  return [...cards].sort((a, b) => {
    const dateA = new Date(a.openedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.openedAt || b.createdAt || 0).getTime();

    return dateA - dateB;
  });
}

export function groupDuplicateCards(collection) {
  const groupsByKey = new Map();

  for (const card of collection || []) {
    const key = getDuplicateKey(card);
    const cards = groupsByKey.get(key) || [];
    cards.push(card);
    groupsByKey.set(key, cards);
  }

  return [...groupsByKey.entries()].map(([key, cards]) => {
    const sortedCards = sortByOldest(cards);
    const keepCard = sortedCards[0];
    const extras = sortedCards.slice(1);

    return {
      key,
      cards: sortedCards,
      keepCard,
      extras,
      totalRecycleValue: extras
        .filter((card) => !isOneOfOneRing(card))
        .reduce((total, card) => total + getRecycleShardValue(card), 0),
    };
  });
}

export function getDuplicateGroups(collection) {
  return groupDuplicateCards(collection).filter((group) => group.cards.length > 1);
}

export function getAutoRecycleExtras(collection) {
  return getDuplicateGroups(collection)
    .flatMap((group) => group.extras)
    .filter((card) => !isOneOfOneRing(card));
}

export function getCardDuplicateId(card) {
  return getCardCopyId(card);
}

export function cardMatchesDuplicateFilter(card, filter) {
  if (filter === 'commons') return card.rarity === 'common';
  if (filter === 'uncommons') return card.rarity === 'uncommon';
  if (filter === 'rares') return card.rarity === 'rare';
  if (filter === 'mythics') return card.rarity === 'mythic';
  if (filter === 'nonfoils') return !card.isFoil;
  if (filter === 'foils') return Boolean(card.isFoil);
  if (filter === 'under1') return getCardPrice(card) > 0 && getCardPrice(card) < 1;
  if (filter === 'under5') return getCardPrice(card) > 0 && getCardPrice(card) < 5;

  return false;
}
