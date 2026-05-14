import { mapCollectionToBattleCards } from './battleCardMapper.js';
import { analyzeDeckColors } from './deckBalance.js';

const RARITY_POWER = {
  common: 0,
  uncommon: 0.4,
  rare: 1,
  mythic: 1.7,
};

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function getEffectPower(effect = {}) {
  if (effect.type === 'removal' || effect.type === 'removeCreature') return 4.5;
  if (effect.type === 'bounce' || effect.type === 'reanimate') return 3.5;
  if (effect.type === 'draw') return (effect.amount || 1) * 1.8;
  if (effect.type === 'damage') return (effect.amount || 1) * 1.25;
  if (effect.type === 'discard') return (effect.amount || 1) * 1.1;
  if (effect.type === 'drain') return (effect.amount || 1) * 1.45;
  if (effect.type === 'debuff') return ((effect.attackPenalty || effect.amount || 1) + (effect.healthPenalty || effect.amount || 1)) * 1.1;
  if (effect.type === 'heal') return (effect.amount || 1) * 0.9;
  if (effect.type === 'buff' || effect.type === 'shield') return (effect.amount || 1) * 1.1;
  if (effect.type === 'weaken') return (effect.amount || 1) * 1.15;
  if (effect.type === 'token' || effect.type === 'createToken') return (effect.token?.attack || effect.attack || 1) + (effect.token?.health || effect.health || 1) * 0.8;
  if (effect.type === 'flex') return 3;
  return effect.amount || 1;
}

export function estimateDeckPower(deck = []) {
  if (!deck.length) return 0;

  const creatureScores = [];
  const spellScores = [];
  let rarityScore = 0;
  let curvePenalty = 0;

  deck.forEach((card) => {
    const cost = Math.max(1, card.cost || 1);
    rarityScore += RARITY_POWER[card.rarity] || 0;
    if (cost >= 6) curvePenalty += 0.8;

    if (card.type === 'creature' || card.type === 'Creature') {
      creatureScores.push(((card.attack || 0) * 1.1 + (card.health || 0)) / Math.sqrt(cost));
    } else {
      spellScores.push((card.effects || []).reduce((total, effect) => total + getEffectPower(effect), 0) / Math.sqrt(cost));
    }
  });

  const colorAnalysis = analyzeDeckColors(deck);
  const flexibilityBonus = Math.min(3, colorAnalysis.multicolorCount * 0.12 + colorAnalysis.fiveColorCount * 0.15);
  const creatureBalance = deck.filter((card) => card.type === 'creature' || card.type === 'Creature').length >= 8 ? 1.5 : -2;

  return Number((
    average(creatureScores) * 5 +
    average(spellScores) * 4 +
    rarityScore / deck.length +
    flexibilityBonus +
    creatureBalance -
    curvePenalty
  ).toFixed(2));
}

export function simulateBattle(deckA, deckB, games = 100) {
  const safeGames = Math.max(1, Math.min(1000, Number(games) || 100));
  const powerA = estimateDeckPower(deckA);
  const powerB = estimateDeckPower(deckB);
  let deckAWins = 0;
  let deckBWins = 0;

  for (let gameIndex = 0; gameIndex < safeGames; gameIndex += 1) {
    const varianceA = Math.sin(gameIndex * 12.9898) * 1.6;
    const varianceB = Math.cos(gameIndex * 78.233) * 1.6;

    if (powerA + varianceA >= powerB + varianceB) {
      deckAWins += 1;
    } else {
      deckBWins += 1;
    }
  }

  return {
    deckAPower: powerA,
    deckAWins,
    deckBPower: powerB,
    deckBWins,
    games: safeGames,
    winRateA: Number((deckAWins / safeGames).toFixed(3)),
  };
}

export function compareColorStrategies(sampleCollection = []) {
  const battleCards = mapCollectionToBattleCards(sampleCollection);
  const bySignature = battleCards.reduce((groups, card) => {
    const signature = card.colorSignature || 'C';
    groups[signature] = groups[signature] || [];
    groups[signature].push(card);
    return groups;
  }, {});

  return Object.entries(bySignature)
    .map(([signature, cards]) => ({
      averagePower: estimateDeckPower(cards),
      cardCount: cards.length,
      colorName: cards[0]?.colorName || signature,
      signature,
      strategy: cards[0]?.colorStrategy || 'Flexible modest utility',
    }))
    .sort((a, b) => b.averagePower - a.averagePower);
}
