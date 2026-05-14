import {
  attackWithCreature,
  endTurn,
  playCard,
} from './battleEngine.js';
import { mapCollectionCardToBattleCard } from './battleCardMapper.js';

const DECK_SIZE = 20;

const STARTER_POOL = [
  { name: 'Sunlit Guard', type_line: 'Creature - Soldier', cmc: 2, power: '1', toughness: '3', colors: ['W'], rarity: 'common', keywords: ['Vigilance'] },
  { name: 'Sky Patrol', type_line: 'Creature - Bird', cmc: 3, power: '2', toughness: '2', colors: ['W'], rarity: 'uncommon', keywords: ['Flying'] },
  { name: 'Healing Light', type_line: 'Instant', cmc: 2, oracle_text: 'You gain 4 life.', colors: ['W'], rarity: 'common' },
  { name: 'Aether Scholar', type_line: 'Creature - Wizard', cmc: 2, power: '1', toughness: '2', colors: ['U'], rarity: 'common' },
  { name: 'Quick Study', type_line: 'Sorcery', cmc: 2, oracle_text: 'Draw a card.', colors: ['U'], rarity: 'common' },
  { name: 'Frost Snare', type_line: 'Instant', cmc: 4, oracle_text: 'Return target creature to its owner hand.', colors: ['U'], rarity: 'uncommon' },
  { name: 'Graveblade Rogue', type_line: 'Creature - Rogue', cmc: 3, power: '2', toughness: '2', colors: ['B'], rarity: 'uncommon', keywords: ['Deathtouch'] },
  { name: 'Dark Drain', type_line: 'Sorcery', cmc: 2, oracle_text: 'Target opponent loses 2 life and you gain 2 life.', colors: ['B'], rarity: 'common' },
  { name: 'Doom Edict', type_line: 'Instant', cmc: 5, oracle_text: 'Destroy target creature.', colors: ['B'], rarity: 'rare' },
  { name: 'Spark Runner', type_line: 'Creature - Goblin', cmc: 2, power: '2', toughness: '1', colors: ['R'], rarity: 'common', keywords: ['Haste'] },
  { name: 'Flame Lash', type_line: 'Instant', cmc: 2, oracle_text: 'Flame Lash deals 3 damage to any target.', colors: ['R'], rarity: 'common' },
  { name: 'War Drummer', type_line: 'Creature - Warrior', cmc: 3, power: '3', toughness: '2', colors: ['R'], rarity: 'uncommon', keywords: ['Menace'] },
  { name: 'Root Bear', type_line: 'Creature - Bear', cmc: 2, power: '2', toughness: '2', colors: ['G'], rarity: 'common' },
  { name: 'Overgrowth Surge', type_line: 'Sorcery', cmc: 3, oracle_text: 'Target creature gets +2/+2 until end of turn.', colors: ['G'], rarity: 'common' },
  { name: 'Beast Call', type_line: 'Sorcery', cmc: 4, oracle_text: 'Create a 2/2 green Beast creature token.', colors: ['G'], rarity: 'uncommon' },
  { name: 'Bronze Myr', type_line: 'Artifact Creature - Myr', cmc: 2, power: '2', toughness: '2', colors: [], rarity: 'common' },
  { name: 'Relic Spark', type_line: 'Artifact', cmc: 3, oracle_text: 'A quiet relic hums with power.', colors: [], rarity: 'common' },
];

const HARD_POOL = [
  { name: 'Seraph Captain', type_line: 'Creature - Angel', cmc: 4, power: '3', toughness: '4', colors: ['W'], rarity: 'rare', keywords: ['Flying', 'Vigilance', 'Lifelink'] },
  { name: 'Moonlit Aegis', type_line: 'Instant', cmc: 2, oracle_text: 'Prevent all damage. Target creature gains indestructible.', colors: ['W'], rarity: 'rare' },
  { name: 'Mindbreak Adept', type_line: 'Creature - Wizard', cmc: 3, power: '2', toughness: '3', colors: ['U'], rarity: 'rare' },
  { name: 'Deep Insight', type_line: 'Sorcery', cmc: 3, oracle_text: 'Draw two cards.', colors: ['U'], rarity: 'rare' },
  { name: 'Night Reaper', type_line: 'Creature - Assassin', cmc: 3, power: '2', toughness: '2', colors: ['B'], rarity: 'rare', keywords: ['Deathtouch', 'Menace'] },
  { name: 'Clean Kill', type_line: 'Instant', cmc: 4, oracle_text: 'Destroy target creature.', colors: ['B'], rarity: 'rare' },
  { name: 'Inferno Adept', type_line: 'Creature - Shaman', cmc: 3, power: '3', toughness: '2', colors: ['R'], rarity: 'rare', keywords: ['Haste', 'First Strike'] },
  { name: 'Blazing Finish', type_line: 'Instant', cmc: 4, oracle_text: 'Blazing Finish deals 5 damage to any target.', colors: ['R'], rarity: 'rare' },
  { name: 'Ancient Baloth', type_line: 'Creature - Beast', cmc: 5, power: '5', toughness: '5', colors: ['G'], rarity: 'rare', keywords: ['Trample'] },
  { name: 'Wild Multiplication', type_line: 'Sorcery', cmc: 4, oracle_text: 'Create a 3/3 green Beast creature token.', colors: ['G'], rarity: 'rare' },
];

function normalizeDifficulty(difficulty = 'normal') {
  return ['easy', 'normal', 'hard'].includes(difficulty) ? difficulty : 'normal';
}

function cardValue(card) {
  const rarityScore = { common: 1, uncommon: 2, rare: 3, mythic: 4 }[card?.rarity] || 1;
  const keywordScore = (card?.keywords || []).length * 0.75;
  const effectScore = (card?.effects || []).reduce((total, effect) => {
    if (effect.type === 'removal' || effect.type === 'removeCreature') return total + 5;
    if (effect.type === 'bounce' || effect.type === 'reanimate') return total + 4;
    if (effect.type === 'damage' || effect.type === 'drain' || effect.type === 'discard') return total + (effect.amount || 1);
    if (effect.type === 'debuff') return total + (effect.attackPenalty || effect.amount || 1) + (effect.healthPenalty || effect.amount || 1);
    if (effect.type === 'token' || effect.type === 'createToken') return total + (effect.token?.attack || effect.attack || 1) + (effect.token?.health || effect.health || 1);
    if (effect.type === 'draw') return total + effect.amount * 2;
    return total + (effect.amount || 1);
  }, 0);

  return (card.attack || 0) + (card.health || 0) + effectScore + rarityScore + keywordScore - (card.cost || 0) * 0.2;
}

function creatureThreat(creature) {
  return (creature.attack || 0) * 2 + (creature.currentHealth || creature.health || 0) + (creature.keywords || []).length;
}

function cloneEnemyCard(card, index, difficulty) {
  return {
    ...card,
    battleId: `enemy-${difficulty}-${index}-${card.battleId || card.userCardId || card.name}`,
    instanceId: undefined,
    userCardId: `enemy-${difficulty}-${index}-${card.userCardId || card.name}`,
  };
}

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildFromPool(pool, difficulty) {
  return Array.from({ length: DECK_SIZE }, (_, index) => cloneEnemyCard(mapCollectionCardToBattleCard(randomFrom(pool)), index, difficulty));
}

function averageCost(deck) {
  if (!deck?.length) return 3;

  return deck.reduce((total, card) => total + (card.cost || card.cmc || 1), 0) / deck.length;
}

function createNormalDeck(playerDeck) {
  const averagePlayerCost = averageCost(playerDeck);
  const mappedPool = STARTER_POOL.map(mapCollectionCardToBattleCard);
  const closeCurvePool = mappedPool.filter((card) => Math.abs(card.cost - averagePlayerCost) <= 2);
  const usablePool = closeCurvePool.length >= 6 ? closeCurvePool : mappedPool;

  return Array.from({ length: DECK_SIZE }, (_, index) => cloneEnemyCard(usablePool[index % usablePool.length], index, 'normal'));
}

function createHardDeck(playerDeck) {
  const mappedStarter = STARTER_POOL.map(mapCollectionCardToBattleCard);
  const mappedHard = HARD_POOL.map(mapCollectionCardToBattleCard);
  const playerInspired = (playerDeck || [])
    .filter((card) => ['rare', 'mythic'].includes(card?.rarity) || cardValue(card) >= 7)
    .map((card) => ({ ...card, rarity: card.rarity || 'rare' }));
  const pool = [...mappedHard, ...mappedHard, ...playerInspired, ...mappedStarter.filter((card) => card.cost <= 3)];
  const sortedPool = [...pool].sort((a, b) => cardValue(b) - cardValue(a));

  return Array.from({ length: DECK_SIZE }, (_, index) => {
    const curvePick = index < 8
      ? sortedPool.find((card) => card.cost <= 3) || sortedPool[index % sortedPool.length]
      : sortedPool[index % sortedPool.length];

    return cloneEnemyCard(curvePick, index, 'hard');
  });
}

export function createEnemyDeck(playerDeck = [], difficulty = 'normal') {
  const normalizedDifficulty = normalizeDifficulty(difficulty);

  if (normalizedDifficulty === 'easy') {
    return buildFromPool(STARTER_POOL.filter((card) => card.rarity !== 'rare'), 'easy');
  }

  if (normalizedDifficulty === 'hard') {
    return createHardDeck(playerDeck);
  }

  return createNormalDeck(playerDeck);
}

export function createFallbackEnemyDeck(playerDeck = [], difficulty = 'normal') {
  return createEnemyDeck(playerDeck, difficulty);
}

function getStrongestCreature(creatures = []) {
  return [...creatures].sort((a, b) => creatureThreat(b) - creatureThreat(a))[0] || null;
}

function getEffectTypes(card) {
  return (card.effects || []).map((effect) => effect.type);
}

function getPrimaryEffect(card) {
  return card.effects?.[0] || null;
}

function canTargetFriendlyCreature(card) {
  return getEffectTypes(card).some((type) => ['artifactBuff', 'buff', 'shield'].includes(type));
}

function canTargetEnemyCreature(card) {
  return getEffectTypes(card).some((type) => ['bounce', 'damage', 'debuff', 'removal', 'removeCreature', 'weaken', 'weakenCreature'].includes(type));
}

function canTargetPlayer(card) {
  return getEffectTypes(card).some((type) => ['damage', 'discard', 'drain', 'generic', 'flex'].includes(type));
}

function getDamageAmount(card) {
  const effect = getPrimaryEffect(card);

  if (!effect) return 0;
  if (['damage', 'discard', 'drain', 'generic', 'flex'].includes(effect.type)) return effect.amount || 1;
  return 0;
}

function chooseSpellTarget(state, card, difficulty) {
  const strongestPlayerCreature = getStrongestCreature(state.player.battlefield);
  const strongestEnemyCreature = getStrongestCreature(state.enemy.battlefield);
  const damageAmount = getDamageAmount(card);

  if (canTargetPlayer(card) && damageAmount >= state.player.health) {
    return { playerId: 'player', type: 'player' };
  }

  if (canTargetEnemyCreature(card) && strongestPlayerCreature) {
    if (difficulty === 'easy' && canTargetPlayer(card)) {
      return { playerId: 'player', type: 'player' };
    }

    return { creatureId: strongestPlayerCreature.instanceId, type: 'creature' };
  }

  if (canTargetFriendlyCreature(card) && strongestEnemyCreature) {
    return { creatureId: strongestEnemyCreature.instanceId, type: 'creature' };
  }

  if (canTargetPlayer(card)) {
    return { playerId: 'player', type: 'player' };
  }

  return undefined;
}

function getPlayableCards(state) {
  return state.enemy.hand.filter((card) => (card.cost || 0) <= state.enemy.mana);
}

function choosePlayableCard(state, difficulty) {
  const playableCards = getPlayableCards(state);

  if (!playableCards.length) return null;
  if (difficulty === 'easy') return playableCards[0];

  const lethalSpell = playableCards.find((card) => canTargetPlayer(card) && getDamageAmount(card) >= state.player.health);
  if (lethalSpell) return lethalSpell;

  const creatures = playableCards.filter((card) => card.type === 'creature' || card.type === 'Creature');
  const removal = playableCards.filter((card) => getEffectTypes(card).some((type) => ['bounce', 'removal', 'removeCreature'].includes(type)));
  const damage = playableCards.filter((card) => getEffectTypes(card).some((type) => ['damage', 'debuff', 'discard', 'drain', 'weaken', 'weakenCreature'].includes(type)));
  const support = playableCards.filter((card) => getEffectTypes(card).some((type) => ['artifactBuff', 'buff', 'draw', 'createToken', 'manaBoost', 'reanimate', 'shield', 'teamBuff', 'token'].includes(type)));

  if (difficulty === 'hard' && state.player.battlefield.length && removal.length) {
    return [...removal].sort((a, b) => cardValue(b) - cardValue(a))[0];
  }

  const orderedCandidates = [
    ...creatures.sort((a, b) => cardValue(b) - cardValue(a)),
    ...damage.sort((a, b) => cardValue(b) - cardValue(a)),
    ...support.sort((a, b) => cardValue(b) - cardValue(a)),
    ...playableCards.sort((a, b) => cardValue(b) - cardValue(a)),
  ];

  return orderedCandidates[0] || playableCards[0];
}

function chooseAttackTarget(state, creature, difficulty) {
  const attack = creature.attack || 0;
  const strongestPlayerCreature = getStrongestCreature(state.player.battlefield);

  if (attack >= state.player.health) {
    return { playerId: 'player', type: 'player' };
  }

  if (difficulty === 'easy') {
    return Math.random() < 0.75 || !strongestPlayerCreature
      ? { playerId: 'player', type: 'player' }
      : { creatureId: strongestPlayerCreature.instanceId, type: 'creature' };
  }

  if (strongestPlayerCreature && creatureThreat(strongestPlayerCreature) > creatureThreat(creature) + (difficulty === 'hard' ? 0 : 2)) {
    return { creatureId: strongestPlayerCreature.instanceId, type: 'creature' };
  }

  return { playerId: 'player', type: 'player' };
}

export function takeEnemyTurn(state, difficulty = 'normal') {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  let nextState = state;

  if (!nextState || nextState.status !== 'playing') return nextState;
  if (nextState.activePlayer !== 'enemy') {
    nextState = endTurn(nextState);
  }
  if (nextState.status !== 'playing' || nextState.activePlayer !== 'enemy') return nextState;

  let safety = 0;
  while (safety < 20 && nextState.status === 'playing') {
    safety += 1;
    const card = choosePlayableCard(nextState, normalizedDifficulty);

    if (!card) break;

    const beforeHandCount = nextState.enemy.hand.length;
    nextState = playCard(nextState, 'enemy', card.instanceId, chooseSpellTarget(nextState, card, normalizedDifficulty));

    if (nextState.enemy.hand.length === beforeHandCount) break;
  }

  const readyCreatures = [...nextState.enemy.battlefield]
    .filter((creature) => creature.canAttack && !creature.hasAttacked)
    .sort((a, b) => cardValue(b) - cardValue(a));

  readyCreatures.forEach((creature) => {
    if (nextState.status === 'playing') {
      nextState = attackWithCreature(nextState, 'enemy', creature.instanceId, chooseAttackTarget(nextState, creature, normalizedDifficulty));
    }
  });

  return nextState.status === 'playing' ? endTurn(nextState) : nextState;
}
