import { getCardsBySet } from '../api/scryfall.js';
import { FOIL_TREATMENTS, normalizeFoilTreatment } from './foilTypes.js';

const PACK_SIZE = 15;
const PLAY_FOIL_ODDS = {
  [FOIL_TREATMENTS.RAINBOW]: 78,
  [FOIL_TREATMENTS.ETCHED]: 9,
  [FOIL_TREATMENTS.GALAXY]: 4,
  [FOIL_TREATMENTS.GILDED]: 3,
  [FOIL_TREATMENTS.TEXTURED]: 1,
  [FOIL_TREATMENTS.NEON_INK]: 5,
};
const COLLECTOR_FOIL_ODDS = {
  [FOIL_TREATMENTS.RAINBOW]: 48,
  [FOIL_TREATMENTS.ETCHED]: 16,
  [FOIL_TREATMENTS.GALAXY]: 12,
  [FOIL_TREATMENTS.GILDED]: 9,
  [FOIL_TREATMENTS.TEXTURED]: 5,
  [FOIL_TREATMENTS.NEON_INK]: 10,
};
const PREMIUM_COLLECTOR_FOIL_ODDS = {
  [FOIL_TREATMENTS.RAINBOW]: 22,
  [FOIL_TREATMENTS.ETCHED]: 17,
  [FOIL_TREATMENTS.GALAXY]: 18,
  [FOIL_TREATMENTS.GILDED]: 17,
  [FOIL_TREATMENTS.TEXTURED]: 11,
  [FOIL_TREATMENTS.NEON_INK]: 15,
};

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

function pickDuplicateFallbackCards(pool, count) {
  if (!pool.length || count <= 0) {
    return [];
  }

  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
}

function pickSlot(pool, fallbackPool, count, usedIds) {
  const pickedCards = pickCards(pool, count, usedIds);

  if (pickedCards.length >= count) {
    return pickedCards;
  }

  const fallbackCards = pickCards(fallbackPool, count - pickedCards.length, usedIds);
  const remainingCount = count - pickedCards.length - fallbackCards.length;

  return [...pickedCards, ...fallbackCards, ...pickDuplicateFallbackCards(fallbackPool, remainingCount)];
}

function pickWeightedTreatment(weights) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [treatment, weight] of entries) {
    roll -= weight;

    if (roll <= 0) {
      return treatment;
    }
  }

  return FOIL_TREATMENTS.RAINBOW;
}

function adjustFoilTreatmentWeights(baseWeights, rarity, { isPremiumSlot = false } = {}) {
  const adjustedWeights = { ...baseWeights };
  const isRareOrMythic = rarity === 'rare' || rarity === 'mythic';

  if (rarity === 'common') {
    adjustedWeights[FOIL_TREATMENTS.RAINBOW] *= 1.9;
    adjustedWeights[FOIL_TREATMENTS.ETCHED] *= 0.75;
    adjustedWeights[FOIL_TREATMENTS.GALAXY] *= 0.2;
    adjustedWeights[FOIL_TREATMENTS.GILDED] *= 0.2;
    adjustedWeights[FOIL_TREATMENTS.TEXTURED] = 0;
    adjustedWeights[FOIL_TREATMENTS.NEON_INK] = isPremiumSlot ? adjustedWeights[FOIL_TREATMENTS.NEON_INK] * 0.15 : 0;
  }

  if (rarity === 'uncommon') {
    adjustedWeights[FOIL_TREATMENTS.RAINBOW] *= 1.25;
    adjustedWeights[FOIL_TREATMENTS.GALAXY] *= 0.65;
    adjustedWeights[FOIL_TREATMENTS.GILDED] *= 0.65;
    adjustedWeights[FOIL_TREATMENTS.TEXTURED] = 0;
    adjustedWeights[FOIL_TREATMENTS.NEON_INK] *= 0.7;
  }

  if (!isRareOrMythic) {
    adjustedWeights[FOIL_TREATMENTS.TEXTURED] = 0;
  }

  if (rarity === 'rare') {
    adjustedWeights[FOIL_TREATMENTS.RAINBOW] *= 0.82;
    adjustedWeights[FOIL_TREATMENTS.GALAXY] *= 1.35;
    adjustedWeights[FOIL_TREATMENTS.GILDED] *= 1.35;
    adjustedWeights[FOIL_TREATMENTS.TEXTURED] *= 1.2;
    adjustedWeights[FOIL_TREATMENTS.NEON_INK] *= 1.5;
  }

  if (rarity === 'mythic') {
    adjustedWeights[FOIL_TREATMENTS.RAINBOW] *= 0.68;
    adjustedWeights[FOIL_TREATMENTS.ETCHED] *= 0.95;
    adjustedWeights[FOIL_TREATMENTS.GALAXY] *= 1.7;
    adjustedWeights[FOIL_TREATMENTS.GILDED] *= 1.7;
    adjustedWeights[FOIL_TREATMENTS.TEXTURED] *= 1.85;
    adjustedWeights[FOIL_TREATMENTS.NEON_INK] *= 2.15;
  }

  return adjustedWeights;
}

export function getRandomFoilTreatment({ boosterType = 'play', rarity, isPremiumSlot = false } = {}) {
  const baseWeights =
    boosterType === 'collector'
      ? isPremiumSlot
        ? PREMIUM_COLLECTOR_FOIL_ODDS
        : COLLECTOR_FOIL_ODDS
      : PLAY_FOIL_ODDS;

  return pickWeightedTreatment(adjustFoilTreatmentWeights(baseWeights, rarity, { isPremiumSlot }));
}

function normalizePackCard(card, { boosterType = 'play', foilTreatment, isFoil = false, isPremiumSlot = false, slot } = {}) {
  let resolvedTreatment = isFoil
    ? normalizeFoilTreatment({
        isFoil: true,
        foilTreatment:
          foilTreatment ||
          getRandomFoilTreatment({
            boosterType,
            rarity: card.rarity,
            isPremiumSlot,
          }),
      })
    : FOIL_TREATMENTS.NONE;

  if (card.rarity === 'common' && resolvedTreatment === FOIL_TREATMENTS.NEON_INK && !isPremiumSlot) {
    resolvedTreatment = FOIL_TREATMENTS.RAINBOW;
  }

  return {
    ...card,
    packSlot: slot,
    isFoil: resolvedTreatment !== FOIL_TREATMENTS.NONE,
    foilTreatment: resolvedTreatment,
  };
}

function withPackMeta(cards, slot, { boosterType = 'play', foilChance = 0 } = {}) {
  return cards.map((card) =>
    normalizePackCard(card, {
      boosterType,
      isFoil: Math.random() < foilChance,
      slot,
    }),
  );
}

function withFoilPackMeta(cards, slot, { boosterType = 'collector', isPremiumSlot = false } = {}) {
  return cards.map((card) =>
    normalizePackCard(card, {
      boosterType,
      isFoil: true,
      isPremiumSlot,
      slot,
    }),
  );
}

function chooseRarityPool(weightedPools) {
  const roll = Math.random();
  let runningWeight = 0;

  for (const { pool, weight } of weightedPools) {
    runningWeight += weight;

    if (roll <= runningWeight && pool.length) {
      return pool;
    }
  }

  return weightedPools.find(({ pool }) => pool.length)?.pool || [];
}

export function revealExcitementScore(card, boosterType = 'play') {
  const typeLine = card?.type_line?.toLowerCase() || '';

  if (typeLine.includes('token') || typeLine.includes('art series')) {
    return 0;
  }

  if (isLand(card)) {
    return boosterType === 'collector' && card.isFoil ? 2 : 1.5;
  }

  const rarityScores = {
    common: card.isFoil ? 2 : 1,
    uncommon: card.isFoil ? 4 : 3,
    rare: card.isFoil ? 8 : 6,
    mythic: card.isFoil ? 11 : 9,
  };
  let score = rarityScores[card.rarity] || (card.isFoil ? 5 : 2.5);

  const foilBonuses = {
    [FOIL_TREATMENTS.ETCHED]: 1,
    [FOIL_TREATMENTS.GALAXY]: 2,
    [FOIL_TREATMENTS.GILDED]: 2,
    [FOIL_TREATMENTS.TEXTURED]: 3,
    [FOIL_TREATMENTS.NEON_INK]: 4,
  };

  score += foilBonuses[card.foilTreatment] || 0;

  return score;
}

export function sortPackForReveal(cards, boosterType = 'play') {
  return [...cards].sort((a, b) => {
    const scoreDifference = revealExcitementScore(a, boosterType) - revealExcitementScore(b, boosterType);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return cards.indexOf(a) - cards.indexOf(b);
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
    ...withPackMeta(pickCards(wildcardPool, 1, usedIds), 'Wildcard', { boosterType: 'play', foilChance: 0.18 }),
    ...withPackMeta(pickCards(rarePool, 1, usedIds), 'Rare or Mythic', { boosterType: 'play', foilChance: 0.12 }),
  ];

  if (pack.length < PACK_SIZE) {
    pack.push(
      ...withPackMeta(pickCards(cards, PACK_SIZE - pack.length, usedIds), 'Wildcard', {
        boosterType: 'play',
        foilChance: 0.1,
      }),
    );
  }

  return sortPackForReveal(pack.slice(0, PACK_SIZE), 'play');
}

export async function generateCollectorBooster(setCode) {
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
  const fallbackPool = wildcardPool.length ? wildcardPool : cards;
  const rareMythicFoilPool = chooseRarityPool([
    { pool: rares, weight: 0.8 },
    { pool: mythics, weight: 0.2 },
  ]);
  const rareMythicNonFoilPool = chooseRarityPool([
    { pool: rares, weight: 0.85 },
    { pool: mythics, weight: 0.15 },
  ]);
  const foilWildcardPool = chooseRarityPool([
    { pool: commons, weight: 0.35 },
    { pool: uncommons, weight: 0.35 },
    { pool: rares, weight: 0.22 },
    { pool: mythics, weight: 0.08 },
  ]);
  const specialFoilPool = chooseRarityPool([
    { pool: rares, weight: 0.7 },
    { pool: mythics, weight: 0.3 },
  ]);
  const finalSlotPool = lands.length ? lands : cards;

  const pack = [
    ...withFoilPackMeta(pickSlot(commons, fallbackPool, 4, usedIds), 'Foil Common', { boosterType: 'collector' }),
    ...withFoilPackMeta(pickSlot(uncommons, fallbackPool, 3, usedIds), 'Foil Uncommon', { boosterType: 'collector' }),
    ...withFoilPackMeta(pickSlot(rareMythicFoilPool, fallbackPool, 2, usedIds), 'Foil Rare or Mythic', {
      boosterType: 'collector',
    }),
    ...withPackMeta(pickSlot(rareMythicNonFoilPool, fallbackPool, 2, usedIds), 'Rare or Mythic', {
      boosterType: 'collector',
    }),
    ...withFoilPackMeta(pickSlot(foilWildcardPool, fallbackPool, 2, usedIds), 'Foil Wildcard', {
      boosterType: 'collector',
    }),
    ...withFoilPackMeta(pickSlot(specialFoilPool, fallbackPool, 1, usedIds), 'Special Foil Wildcard', {
      boosterType: 'collector',
      isPremiumSlot: true,
    }),
    ...withFoilPackMeta(pickSlot(finalSlotPool, cards, 1, usedIds), 'Foil Land or Token', {
      boosterType: 'collector',
    }),
  ];

  if (pack.length < PACK_SIZE) {
    pack.push(
      ...withFoilPackMeta(pickCards(cards, PACK_SIZE - pack.length, usedIds), 'Foil Wildcard', {
        boosterType: 'collector',
      }),
    );
  }

  return sortPackForReveal(pack.slice(0, PACK_SIZE), 'collector');
}
