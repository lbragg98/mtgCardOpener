import { getCardsBySet } from '../api/scryfall.js';

const PACK_SIZE = 15;

function shuffle(cards) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function isLand(card) {
  return card.type_line?.toLowerCase().includes('land');
}

function pickCards(pool, count, usedIds) {
  const availableCards = shuffle(pool).filter((card) => !usedIds.has(card.id));
  const pickedCards = availableCards.slice(0, count);

  pickedCards.forEach((card) => usedIds.add(card.id));

  return pickedCards;
}

function withPackMeta(cards, slot, { foilChance = 0 } = {}) {
  return cards.map((card) => ({
    ...card,
    packSlot: slot,
    isFoil: Math.random() < foilChance,
  }));
}

export function sortPackForReveal(cards) {
  const rarityScore = {
    common: 1,
    uncommon: 2,
    rare: 5,
    mythic: 6,
  };

  return [...cards].sort((a, b) => {
    const aScore = (rarityScore[a.rarity] || 3) + (a.isFoil ? 4 : 0) + (isLand(a) ? 1.5 : 0);
    const bScore = (rarityScore[b.rarity] || 3) + (b.isFoil ? 4 : 0) + (isLand(b) ? 1.5 : 0);

    return aScore - bScore;
  });
}

export async function generatePlayBooster(setCode) {
  const cards = await getCardsBySet(setCode);

  if (!cards.length) {
    throw new Error('No cards with usable images were found for this set.');
  }

  const usedIds = new Set();
  const commons = cards.filter((card) => card.rarity === 'common' && !isLand(card));
  const uncommons = cards.filter((card) => card.rarity === 'uncommon' && !isLand(card));
  const rares = cards.filter((card) => card.rarity === 'rare' && !isLand(card));
  const mythics = cards.filter((card) => card.rarity === 'mythic' && !isLand(card));
  const lands = cards.filter(isLand);
  const wildcardPool = cards.filter((card) => !isLand(card));
  const rarePool = Math.random() < 0.15 && mythics.length ? mythics : [...rares, ...mythics];

  const pack = [
    ...withPackMeta(pickCards(commons, 9, usedIds), 'Common'),
    ...withPackMeta(pickCards(uncommons, 3, usedIds), 'Uncommon'),
    ...withPackMeta(pickCards(lands, 1, usedIds), 'Land'),
    ...withPackMeta(pickCards(wildcardPool, 1, usedIds), 'Wildcard', { foilChance: 0.18 }),
    ...withPackMeta(pickCards(rarePool, 1, usedIds), 'Rare or Mythic', { foilChance: 0.12 }),
  ];

  if (pack.length < PACK_SIZE) {
    pack.push(...withPackMeta(pickCards(cards, PACK_SIZE - pack.length, usedIds), 'Wildcard', { foilChance: 0.1 }));
  }

  return sortPackForReveal(pack.slice(0, PACK_SIZE));
}
