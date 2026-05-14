const RARITY_STATS = {
  common: { attack: 2, cost: 1, health: 2 },
  uncommon: { attack: 3, cost: 2, health: 3 },
  rare: { attack: 4, cost: 3, health: 4 },
  mythic: { attack: 6, cost: 4, health: 5 },
};

export function getBattleCardStats(card) {
  const base = RARITY_STATS[card?.rarity] || RARITY_STATS.common;
  const foilBonus = card?.isFoil ? 1 : 0;
  const collectorBonus = card?.isCollectorExclusive ? 1 : 0;

  return {
    attack: base.attack + foilBonus + collectorBonus,
    cost: Math.max(1, base.cost + (card?.isCollectorExclusive ? 1 : 0)),
    health: base.health + foilBonus,
  };
}

export function getBattleCardType(card) {
  if (card?.isCollectorExclusive || card?.rarity === 'mythic') {
    return 'Finisher';
  }

  if (card?.isFoil || card?.rarity === 'rare') {
    return 'Spell';
  }

  return 'Creature';
}

export function getBattleReward(deck) {
  const rareCount = deck.filter((card) => ['rare', 'mythic'].includes(card?.rarity)).length;

  return 40 + rareCount * 5;
}
