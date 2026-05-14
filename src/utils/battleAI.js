import {
  attackWithCreature,
  endTurn,
  playCard,
} from './battleEngine.js';
import { mapCollectionCardToBattleCard } from './battleCardMapper.js';
import {
  getLegalAttackers,
  getLegalAttackTargets,
  getLegalPlayableCards,
  getLegalTargetsForCard,
  validateBattleAction,
} from './battleMoveValidator.js';

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

function getWeakestCreature(creatures = []) {
  return [...creatures].sort((a, b) => creatureThreat(a) - creatureThreat(b))[0] || null;
}

function getOpponentKey(playerKey) {
  return playerKey === 'enemy' ? 'player' : 'enemy';
}

function getCardId(card) {
  return card?.instanceId || card?.battleId || card?.userCardId || card?.id || card?.scryfallId;
}

function warnInvalidAIAction(action, reason) {
  if (import.meta.env.DEV) {
    console.warn('AI attempted invalid action', { action, reason });
  }
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

function canPlayWithoutTarget(state, playerKey, card) {
  if (card?.type === 'creature' || card?.type === 'Creature') return true;

  const opponentKey = getOpponentKey(playerKey);
  if (canTargetEnemyCreature(card) && !state[opponentKey].battlefield.length && !canTargetPlayer(card)) return false;
  if (canTargetFriendlyCreature(card) && !state[playerKey].battlefield.length) return false;

  return true;
}

function wouldCreatureSurviveAttack(attacker, defender) {
  if (!defender) return true;
  const attackerHealth = Number(attacker.currentHealth || attacker.health || 1);
  const defenderAttack = Number(defender.attack || 0);
  const attackerHasFirstStrike = (attacker.keywords || []).some((keyword) => String(keyword).toLowerCase() === 'first strike');
  const defenderHealth = Number(defender.currentHealth || defender.health || 1);

  return attackerHasFirstStrike && Number(attacker.attack || 0) >= defenderHealth
    ? true
    : attackerHealth > defenderAttack;
}

export function evaluateCreatureThreat(creature) {
  return creatureThreat(creature);
}

export function evaluateCardPlay(state, aiPlayerKey, card) {
  if (!state?.[aiPlayerKey] || !card) return -Infinity;

  const opponentKey = getOpponentKey(aiPlayerKey);
  const effectTypes = getEffectTypes(card);
  let score = cardValue(card);

  if ((card.cost || 0) > state[aiPlayerKey].mana) return -Infinity;
  if (!canPlayWithoutTarget(state, aiPlayerKey, card)) return -Infinity;

  if (card.type === 'creature') {
    score += state[aiPlayerKey].battlefield.length < state[opponentKey].battlefield.length ? 2 : 0;
    if ((card.keywords || []).includes('Haste')) score += 1.5;
    if ((card.keywords || []).includes('Flying')) score += 1;
  }

  if (effectTypes.some((type) => ['damage', 'drain', 'generic', 'flex'].includes(type))) {
    score += getDamageAmount(card) >= state[opponentKey].health ? 100 : 0;
    score += state[opponentKey].health <= 6 ? 2 : 0;
  }

  if (effectTypes.some((type) => ['removal', 'removeCreature', 'bounce', 'weakenCreature', 'debuff'].includes(type))) {
    const bestTarget = getStrongestCreature(state[opponentKey].battlefield);
    score += bestTarget ? Math.min(8, evaluateCreatureThreat(bestTarget)) : -4;
  }

  if (effectTypes.some((type) => ['buff', 'artifactBuff', 'shield', 'teamBuff'].includes(type))) {
    score += state[aiPlayerKey].battlefield.length ? 3 : -5;
  }

  if (effectTypes.includes('draw')) {
    score += state[aiPlayerKey].hand.length <= 2 ? 3 : 1;
  }

  if (effectTypes.some((type) => ['token', 'createToken', 'reanimate'].includes(type))) {
    score += state[aiPlayerKey].battlefield.length < 5 ? 2 : -1;
  }

  return score;
}

export function evaluateBoardState(state, aiPlayerKey) {
  if (!state?.[aiPlayerKey]) {
    return {
      aiBoardPower: 0,
      aiHealth: 0,
      aiMana: 0,
      enemyBoardPower: 0,
      enemyHealth: 0,
      score: 0,
    };
  }

  const opponentKey = getOpponentKey(aiPlayerKey);
  const aiBoardPower = state[aiPlayerKey].battlefield.reduce((total, creature) => total + evaluateCreatureThreat(creature), 0);
  const enemyBoardPower = state[opponentKey].battlefield.reduce((total, creature) => total + evaluateCreatureThreat(creature), 0);
  const score = (state[aiPlayerKey].health - state[opponentKey].health) +
    (aiBoardPower - enemyBoardPower) +
    state[aiPlayerKey].hand.length * 0.75 +
    state[aiPlayerKey].mana * 0.25;

  return {
    aiBoardPower,
    aiHealth: state[aiPlayerKey].health,
    aiMana: state[aiPlayerKey].mana,
    enemyBoardPower,
    enemyHealth: state[opponentKey].health,
    score,
  };
}

export function chooseBestPlayableCard(state, aiPlayerKey = 'enemy', difficulty = 'normal') {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const aiState = state?.[aiPlayerKey];
  const opponentKey = getOpponentKey(aiPlayerKey);

  if (!aiState || state.activePlayer !== aiPlayerKey) return null;

  const playableCards = getLegalPlayableCards(state, aiPlayerKey);
  if (!playableCards.length) return null;
  if (normalizedDifficulty === 'easy') return playableCards.find((card) => canPlayWithoutTarget(state, aiPlayerKey, card)) || playableCards[0];

  const lethalSpell = playableCards.find((card) => canTargetPlayer(card) && getDamageAmount(card) >= state[opponentKey].health);
  if (lethalSpell) return lethalSpell;

  const playableWithScores = playableCards
    .map((card) => ({ card, score: evaluateCardPlay(state, aiPlayerKey, card) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || (b.card.cost || 0) - (a.card.cost || 0));

  if (normalizedDifficulty === 'hard') {
    const buffBeforeAttack = playableWithScores.find((entry) =>
      getEffectTypes(entry.card).some((type) => ['buff', 'artifactBuff', 'teamBuff'].includes(type)) &&
      aiState.battlefield.some((creature) => creature.canAttack && !creature.hasAttacked),
    );
    if (buffBeforeAttack) return buffBeforeAttack.card;
  }

  return playableWithScores[0]?.card || null;
}

export function chooseBestTargetForSpell(state, aiPlayerKey = 'enemy', card, difficulty = 'normal') {
  if (!state?.[aiPlayerKey] || !card) return undefined;

  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const opponentKey = getOpponentKey(aiPlayerKey);
  const legalTargets = getLegalTargetsForCard(state, aiPlayerKey, card).filter((target) => target.type !== 'none');
  const strongestOpponentCreature = getStrongestCreature(state[opponentKey].battlefield);
  const weakestOpponentCreature = getWeakestCreature(state[opponentKey].battlefield);
  const strongestFriendlyCreature = getStrongestCreature(state[aiPlayerKey].battlefield);
  const damageAmount = getDamageAmount(card);
  const effectTypes = getEffectTypes(card);

  if (canTargetPlayer(card) && damageAmount >= state[opponentKey].health) {
    return legalTargets.find((target) => target.type === 'player' && target.playerId === opponentKey);
  }

  if (canTargetFriendlyCreature(card)) {
    return legalTargets.find((target) => target.creatureId === strongestFriendlyCreature?.instanceId);
  }

  if (canTargetEnemyCreature(card)) {
    if (normalizedDifficulty === 'easy' && canTargetPlayer(card) && Math.random() < 0.45) {
      return legalTargets.find((target) => target.type === 'player' && target.playerId === opponentKey);
    }

    const target = normalizedDifficulty === 'hard'
      ? strongestOpponentCreature
      : strongestOpponentCreature || weakestOpponentCreature;
    return legalTargets.find((legalTarget) => legalTarget.creatureId === target?.instanceId);
  }

  if (effectTypes.includes('discard') || effectTypes.includes('drain') || canTargetPlayer(card)) {
    return legalTargets.find((target) => target.type === 'player' && target.playerId === opponentKey);
  }

  return undefined;
}

export function chooseAttackTargets(state, aiPlayerKey = 'enemy', difficulty = 'normal') {
  if (!state?.[aiPlayerKey]) return [];

  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const opponentKey = getOpponentKey(aiPlayerKey);
  const readyCreatures = getLegalAttackers(state, aiPlayerKey)
    .sort((a, b) => evaluateCreatureThreat(b) - evaluateCreatureThreat(a));
  const opponentCreatures = [...state[opponentKey].battlefield]
    .sort((a, b) => evaluateCreatureThreat(b) - evaluateCreatureThreat(a));

  return readyCreatures
    .map((creature) => {
      const attack = Number(creature.attack || 0);

      if (attack >= state[opponentKey].health) {
        const legalTarget = getLegalAttackTargets(state, aiPlayerKey, creature).find((target) => target.type === 'player' && target.playerId === opponentKey);
        return legalTarget ? {
          creatureId: creature.instanceId,
          reason: 'lethal attack',
          target: legalTarget,
        } : null;
      }

      if (normalizedDifficulty === 'easy') {
        const targetCreature = opponentCreatures[0];
        const preferredTarget = Math.random() < 0.75 || !targetCreature
          ? { playerId: opponentKey, type: 'player' }
          : { creatureId: targetCreature.instanceId, type: 'creature' };
        const target = getLegalAttackTargets(state, aiPlayerKey, creature).find((legalTarget) =>
          legalTarget.type === preferredTarget.type &&
          (legalTarget.playerId === preferredTarget.playerId || legalTarget.creatureId === preferredTarget.creatureId),
        );
        if (!target) return null;
        return { creatureId: creature.instanceId, reason: 'easy pressure', target };
      }

      const favorableTrade = opponentCreatures.find((defender) =>
        attack >= Number(defender.currentHealth || defender.health || 1) &&
        (normalizedDifficulty !== 'hard' || wouldCreatureSurviveAttack(creature, defender)),
      );

      if (favorableTrade && evaluateCreatureThreat(favorableTrade) >= evaluateCreatureThreat(creature) - 1) {
        const target = getLegalAttackTargets(state, aiPlayerKey, creature).find((legalTarget) => legalTarget.creatureId === favorableTrade.instanceId);
        return target ? {
          creatureId: creature.instanceId,
          reason: 'favorable trade',
          target,
        } : null;
      }

      if (normalizedDifficulty === 'hard' && opponentCreatures.length) {
        const badIntoBoard = opponentCreatures.some((defender) =>
          Number(defender.attack || 0) >= Number(creature.currentHealth || creature.health || 1) &&
          attack < Number(defender.currentHealth || defender.health || 1),
        );

        if (badIntoBoard && state[aiPlayerKey].health > 6) return null;
      }

      const faceTarget = getLegalAttackTargets(state, aiPlayerKey, creature).find((target) => target.type === 'player' && target.playerId === opponentKey);
      return faceTarget ? {
        creatureId: creature.instanceId,
        reason: 'attack opponent',
        target: faceTarget,
      } : null;
    })
    .filter(Boolean);
}

export function executeAIAction(state, action) {
  if (!state || !action) return state;
  const playerKey = action.playerKey || 'enemy';
  const validation = validateBattleAction(state, playerKey, action);

  if (!validation.valid) {
    warnInvalidAIAction(action, validation.reason);
    return state;
  }

  if (action.type === 'playCard') {
    return playCard(state, playerKey, action.cardId, action.target);
  }

  if (action.type === 'attack') {
    return attackWithCreature(state, playerKey, action.creatureId, action.target);
  }

  if (action.type === 'endTurn') {
    return endTurn(state);
  }

  return state;
}

export function planAITurn(state, aiPlayerKey = 'enemy', difficulty = 'normal') {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const actions = [];
  let finalState = state;

  if (!finalState || finalState.status !== 'playing' || finalState.activePlayer !== aiPlayerKey) {
    return { actions, finalState };
  }

  let safety = 0;
  while (safety < 20 && finalState.status === 'playing' && finalState.activePlayer === aiPlayerKey) {
    safety += 1;
    const card = chooseBestPlayableCard(finalState, aiPlayerKey, normalizedDifficulty);
    if (!card) break;

    const beforeHandCount = finalState[aiPlayerKey].hand.length;
    const target = chooseBestTargetForSpell(finalState, aiPlayerKey, card, normalizedDifficulty);
    const action = {
      cardId: getCardId(card),
      cardName: card.name,
      playerKey: aiPlayerKey,
      reason: `played ${card.name}`,
      target,
      targetId: target?.creatureId || target?.playerId,
      targetType: target?.type,
      type: 'playCard',
    };
    const validation = validateBattleAction(finalState, aiPlayerKey, action);
    if (!validation.valid) {
      warnInvalidAIAction(action, validation.reason);
      break;
    }

    const nextState = executeAIAction(finalState, action);

    actions.push(action);
    finalState = nextState;

    if (finalState[aiPlayerKey].hand.length === beforeHandCount) break;
  }

  chooseAttackTargets(finalState, aiPlayerKey, normalizedDifficulty).forEach((attackPlan) => {
    if (finalState.status !== 'playing' || finalState.activePlayer !== aiPlayerKey) return;

    const action = {
      creatureId: attackPlan.creatureId,
      playerKey: aiPlayerKey,
      reason: attackPlan.reason,
      target: attackPlan.target,
      targetId: attackPlan.target?.creatureId || attackPlan.target?.playerId,
      targetType: attackPlan.target?.type,
      type: 'attack',
    };
    const validation = validateBattleAction(finalState, aiPlayerKey, action);
    if (!validation.valid) {
      warnInvalidAIAction(action, validation.reason);
      return;
    }

    const nextState = executeAIAction(finalState, action);
    if (nextState !== finalState) {
      finalState = nextState;
      actions.push(action);
    }
  });

  if (finalState.status === 'playing' && finalState.activePlayer === aiPlayerKey) {
    const action = {
      playerKey: aiPlayerKey,
      reason: 'AI turn complete',
      type: 'endTurn',
    };
    const validation = validateBattleAction(finalState, aiPlayerKey, action);
    if (validation.valid) {
      finalState = executeAIAction(finalState, action);
      actions.push(action);
    } else {
      warnInvalidAIAction(action, validation.reason);
    }
  }

  return { actions, finalState };
}

export function takeAITurn(state, aiPlayerKey = 'enemy', difficulty = 'normal') {
  return planAITurn(state, aiPlayerKey, difficulty);
}

export function takeEnemyTurn(state, difficulty = 'normal') {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  let nextState = state;

  if (!nextState || nextState.status !== 'playing') return nextState;
  if (nextState.activePlayer !== 'enemy') {
    nextState = endTurn(nextState);
  }
  return takeAITurn(nextState, 'enemy', normalizedDifficulty).finalState;
}
