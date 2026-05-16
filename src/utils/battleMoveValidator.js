const PLAYER_KEYS = ['player', 'enemy'];

function getOpponentKey(playerKey) {
  return playerKey === 'enemy' ? 'player' : 'enemy';
}

function hasKeyword(card, keyword) {
  return (card?.keywords || []).some((cardKeyword) => String(cardKeyword).toLowerCase() === keyword.toLowerCase());
}

function getCardId(card) {
  return card?.instanceId || card?.battleId || card?.userCardId || card?.id || card?.scryfallId;
}

function findCard(cards = [], cardId) {
  return cards.find((card) => [card.instanceId, card.battleId, card.userCardId, card.id, card.scryfallId].filter(Boolean).includes(cardId));
}

function normalizeTarget(target) {
  if (!target) return { type: 'player' };
  if (typeof target === 'string') {
    if (target === 'player' || target === 'enemy') return { playerId: target, type: 'player' };
    if (target === 'enemyPlayer') return { playerId: 'enemy', type: 'player' };
    if (target === 'playerFace') return { playerId: 'player', type: 'player' };
    return { creatureId: target, type: 'creature' };
  }

  return target;
}

function getEffectTypes(card) {
  return (card?.effects || []).map((effect) => effect.type);
}

function getTargetKindsForCard(card) {
  const effectTypes = getEffectTypes(card);
  const targetTypes = (card?.effects || []).map((effect) => effect.targetType || effect.target);
  const targetKinds = new Set();

  if (card?.type === 'creature' || card?.type === 'Creature') return targetKinds;
  if (targetTypes.includes('self') || effectTypes.some((type) => ['draw', 'heal', 'manaBoost', 'reanimate', 'teamBuff', 'token', 'createToken'].includes(type))) {
    targetKinds.add('none');
  }
  if (targetTypes.includes('friendlyCreature') || effectTypes.some((type) => ['artifactBuff', 'buff', 'shield'].includes(type))) {
    targetKinds.add('friendlyCreature');
  }
  if (targetTypes.includes('enemyCreature') || effectTypes.some((type) => ['bounce', 'debuff', 'removal', 'removeCreature', 'tapStun', 'weaken', 'weakenCreature'].includes(type))) {
    targetKinds.add('enemyCreature');
  }
  if (targetTypes.includes('enemyAny') || effectTypes.some((type) => ['damage', 'discard', 'drain', 'generic', 'flex'].includes(type))) {
    targetKinds.add('enemyPlayer');
    targetKinds.add('enemyCreature');
  }

  if (!targetKinds.size) targetKinds.add('none');
  return targetKinds;
}

function targetMatches(legalTargets, target) {
  const normalizedTarget = normalizeTarget(target);
  return legalTargets.some((legalTarget) => {
    if (legalTarget.type !== normalizedTarget.type) return false;
    if (legalTarget.type === 'player') return legalTarget.playerId === normalizedTarget.playerId;
    return legalTarget.creatureId === (normalizedTarget.creatureId || normalizedTarget.instanceId);
  });
}

function validateBaseState(state, playerKey) {
  if (!state || !PLAYER_KEYS.includes(playerKey)) return { reason: 'Invalid player.', valid: false };
  if (state.status !== 'playing') return { reason: 'Game is not playing.', valid: false };
  if (state.activePlayer !== playerKey) return { reason: 'It is not that player turn.', valid: false };
  return { valid: true };
}

export function getLegalPlayableCards(state, playerKey) {
  if (!validateBaseState(state, playerKey).valid) return [];

  return (state[playerKey]?.hand || []).filter((card) => {
    if (!card) return false;
    return Number(card.cost || 0) <= Number(state[playerKey].mana || 0);
  });
}

export function getLegalTargetsForCard(state, playerKey, card) {
  if (!validateBaseState(state, playerKey).valid || !card) return [];

  const targetKinds = getTargetKindsForCard(card);
  const opponentKey = getOpponentKey(playerKey);
  const targets = [];

  if (targetKinds.has('none')) {
    targets.push({ type: 'none' });
  }

  if (targetKinds.has('enemyPlayer')) {
    targets.push({ playerId: opponentKey, type: 'player' });
  }

  if (targetKinds.has('friendlyCreature')) {
    (state[playerKey].battlefield || [])
      .filter((creature) => Number(creature.currentHealth ?? creature.health ?? 1) > 0)
      .forEach((creature) => targets.push({ creatureId: creature.instanceId, type: 'creature' }));
  }

  if (targetKinds.has('enemyCreature')) {
    (state[opponentKey].battlefield || [])
      .filter((creature) => Number(creature.currentHealth ?? creature.health ?? 1) > 0)
      .forEach((creature) => targets.push({ creatureId: creature.instanceId, type: 'creature' }));
  }

  return targets;
}

export function getLegalAttackers(state, playerKey) {
  if (!validateBaseState(state, playerKey).valid) return [];

  return (state[playerKey]?.battlefield || []).filter((creature) => {
    if (!creature) return false;
    if (!creature.canAttack || creature.hasAttacked) return false;
    if (creature.summonedThisTurn && !hasKeyword(creature, 'Haste')) return false;
    if (hasKeyword(creature, 'Defender')) return false;
    return Number(creature.currentHealth ?? creature.health ?? 1) > 0;
  });
}

export function getLegalAttackTargets(state, playerKey, creature) {
  if (!validateBaseState(state, playerKey).valid || !creature) return [];

  const opponentKey = getOpponentKey(playerKey);
  return [
    { playerId: opponentKey, type: 'player' },
    ...(state[opponentKey]?.battlefield || [])
      .filter((enemyCreature) => Number(enemyCreature.currentHealth ?? enemyCreature.health ?? 1) > 0)
      .map((enemyCreature) => ({ creatureId: enemyCreature.instanceId, type: 'creature' })),
  ];
}

export function validateBattleAction(state, playerKey, action) {
  const base = validateBaseState(state, playerKey);
  if (!base.valid) return base;
  if (!action?.type) return { reason: 'Missing action type.', valid: false };
  if (action.type === 'endTurn') return { valid: true };

  if (action.type === 'playCard') {
    const card = findCard(state[playerKey].hand, action.cardId);
    if (!card) return { reason: 'Card is not in hand.', valid: false };
    if (Number(card.cost || 0) > Number(state[playerKey].mana || 0)) return { reason: 'Not enough mana.', valid: false };

    const legalTargets = getLegalTargetsForCard(state, playerKey, card);
    const requiresTarget = legalTargets.some((target) => target.type !== 'none');
    if (requiresTarget && !targetMatches(legalTargets, action.target)) return { reason: 'Invalid spell target.', valid: false };

    return { card, valid: true };
  }

  if (action.type === 'attack') {
    const creature = findCard(state[playerKey].battlefield, action.creatureId);
    if (!creature) return { reason: 'Creature is not on the battlefield.', valid: false };
    if (!getLegalAttackers(state, playerKey).some((attacker) => getCardId(attacker) === getCardId(creature))) {
      return { reason: 'Creature cannot legally attack.', valid: false };
    }
    if (!targetMatches(getLegalAttackTargets(state, playerKey, creature), action.target)) {
      return { reason: 'Invalid attack target.', valid: false };
    }

    return { creature, valid: true };
  }

  return { reason: 'Unknown action type.', valid: false };
}

export function getLegalActions(state, playerKey) {
  const actions = [];

  getLegalPlayableCards(state, playerKey).forEach((card) => {
    const targets = getLegalTargetsForCard(state, playerKey, card);
    const nonEmptyTargets = targets.filter((target) => target.type !== 'none');

    if (!nonEmptyTargets.length) {
      actions.push({ card, cardId: getCardId(card), playerKey, type: 'playCard' });
      return;
    }

    nonEmptyTargets.forEach((target) => {
      actions.push({
        card,
        cardId: getCardId(card),
        playerKey,
        target,
        targetId: target.creatureId || target.playerId,
        targetType: target.type,
        type: 'playCard',
      });
    });
  });

  getLegalAttackers(state, playerKey).forEach((creature) => {
    getLegalAttackTargets(state, playerKey, creature).forEach((target) => {
      actions.push({
        creature,
        creatureId: getCardId(creature),
        playerKey,
        target,
        targetId: target.creatureId || target.playerId,
        targetType: target.type,
        type: 'attack',
      });
    });
  });

  actions.push({ playerKey, type: 'endTurn' });
  return actions;
}
