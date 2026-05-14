const PLAYER_IDS = ['player', 'enemy'];
const STARTING_HEALTH = 20;
const MAX_PLAYER_HEALTH = 30;
const STARTING_HAND_SIZE = 3;
const STARTING_MANA = 1;
const MAX_MANA = 10;

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffleDeck(deck) {
  const shuffled = [...(deck || [])];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.map((card, index) => ({
    ...card,
    instanceId: card.instanceId || createId(`deck-${index}`),
  }));
}

function getOpponentId(playerId) {
  return playerId === 'enemy' ? 'player' : 'enemy';
}

function assertPlayerId(playerId) {
  return PLAYER_IDS.includes(playerId);
}

function cloneZone(zone = []) {
  return zone.map((card) => ({ ...card }));
}

function clonePlayer(player) {
  return {
    ...player,
    battlefield: cloneZone(player.battlefield),
    deck: cloneZone(player.deck),
    graveyard: cloneZone(player.graveyard),
    hand: cloneZone(player.hand),
  };
}

function cloneState(state) {
  return {
    ...state,
    enemy: clonePlayer(state.enemy),
    log: [...(state.log || [])],
    player: clonePlayer(state.player),
  };
}

function appendLog(state, message, type = 'info') {
  return {
    ...state,
    log: [createBattleLogEntry(message, type), ...(state.log || [])].slice(0, 80),
  };
}

function findCardIndex(cards, cardId) {
  return cards.findIndex((card) =>
    [card.instanceId, card.battleId, card.userCardId, card.id, card.scryfallId].filter(Boolean).includes(cardId),
  );
}

function isCreature(card) {
  return card?.type === 'creature' || card?.type === 'Creature' || Number(card?.health || card?.maxHealth) > 0;
}

function hasKeyword(card, keyword) {
  return (card?.keywords || []).some((cardKeyword) => String(cardKeyword).toLowerCase() === keyword.toLowerCase());
}

function createBattlefieldCreature(card, summonedThisTurn = true) {
  const maxHealth = Math.max(1, Number(card.maxHealth || card.health || 1));
  const hasHaste = hasKeyword(card, 'Haste');
  const hasDefender = hasKeyword(card, 'Defender');

  return {
    ...card,
    attack: Math.max(0, Number(card.attack || 0)),
    canAttack: hasHaste && !hasDefender,
    currentHealth: maxHealth,
    hasAttacked: false,
    health: maxHealth,
    instanceId: createId('creature'),
    maxHealth,
    summonedThisTurn: summonedThisTurn && !hasHaste,
  };
}

function removeDeadCreatures(playerState) {
  const destroyed = playerState.battlefield.filter((card) => card.currentHealth <= 0);

  if (!destroyed.length) {
    return playerState;
  }

  return {
    ...playerState,
    battlefield: playerState.battlefield.filter((card) => card.currentHealth > 0),
    graveyard: [...playerState.graveyard, ...destroyed],
  };
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

function damagePlayer(state, playerId, amount) {
  const damage = Math.max(0, Number(amount || 0));

  return {
    ...state,
    [playerId]: {
      ...state[playerId],
      health: Math.max(0, state[playerId].health - damage),
    },
  };
}

function healPlayer(state, playerId, amount) {
  const healing = Math.max(0, Number(amount || 0));

  return {
    ...state,
    [playerId]: {
      ...state[playerId],
      health: Math.min(MAX_PLAYER_HEALTH, state[playerId].health + healing),
    },
  };
}

function damageCreature(state, playerId, creatureId, amount) {
  const damage = Math.max(0, Number(amount || 0));
  const playerState = state[playerId];
  const battlefield = playerState.battlefield.map((creature) => {
    if (creature.instanceId !== creatureId) {
      return creature;
    }

    const shield = Math.max(0, Number(creature.shield || 0));
    const preventedDamage = Math.min(shield, damage);
    const remainingDamage = damage - preventedDamage;

    return {
      ...creature,
      currentHealth: creature.currentHealth - remainingDamage,
      shield: Math.max(0, shield - preventedDamage),
    };
  });

  return {
    ...state,
    [playerId]: removeDeadCreatures({
      ...playerState,
      battlefield,
    }),
  };
}

function applyDamageToCreature(creature, amount) {
  const damage = Math.max(0, Number(amount || 0));
  const shield = Math.max(0, Number(creature.shield || 0));
  const preventedDamage = Math.min(shield, damage);
  const remainingDamage = damage - preventedDamage;

  return {
    ...creature,
    currentHealth: creature.currentHealth - remainingDamage,
    shield: Math.max(0, shield - preventedDamage),
  };
}

function getPlayerAttackDamage(attacker) {
  let damage = Math.max(0, Number(attacker.attack || 0));

  if (hasKeyword(attacker, 'Flying')) damage += 1;
  if (hasKeyword(attacker, 'Menace')) damage += 1;

  return damage;
}

function applyLifelink(state, playerId, creature, damageAmount) {
  if (!hasKeyword(creature, 'Lifelink') || damageAmount <= 0) {
    return state;
  }

  return healPlayer(state, playerId, damageAmount);
}

function shieldCreature(state, playerId, creatureId, amount) {
  const shield = Math.max(1, Number(amount || 1));
  const playerState = state[playerId];

  return {
    ...state,
    [playerId]: {
      ...playerState,
      battlefield: playerState.battlefield.map((creature) =>
        creature.instanceId === creatureId
          ? {
              ...creature,
              currentHealth: creature.currentHealth + shield,
              shield: Math.max(0, Number(creature.shield || 0)) + shield,
            }
          : creature,
      ),
    },
  };
}

function removeCreature(state, playerId, creatureId) {
  const playerState = state[playerId];
  const removedCreatures = playerState.battlefield.filter((creature) => creature.instanceId === creatureId);

  if (!removedCreatures.length) {
    return state;
  }

  return {
    ...state,
    [playerId]: {
      ...playerState,
      battlefield: playerState.battlefield.filter((creature) => creature.instanceId !== creatureId),
      graveyard: [...playerState.graveyard, ...removedCreatures],
    },
  };
}

function buffCreature(state, playerId, creatureId, amount) {
  const attackBonus = typeof amount === 'object' ? Math.max(0, Number(amount.attackBonus ?? amount.amount ?? 1)) : Math.max(1, Number(amount || 1));
  const healthBonus = typeof amount === 'object' ? Math.max(0, Number(amount.healthBonus ?? amount.amount ?? 1)) : Math.max(1, Number(amount || 1));
  const playerState = state[playerId];

  return {
    ...state,
    [playerId]: {
      ...playerState,
      battlefield: playerState.battlefield.map((creature) =>
        creature.instanceId === creatureId
          ? {
              ...creature,
              attack: creature.attack + attackBonus,
              currentHealth: creature.currentHealth + healthBonus,
              health: creature.health + healthBonus,
              maxHealth: creature.maxHealth + healthBonus,
            }
          : creature,
      ),
    },
  };
}

function weakenCreature(state, playerId, creatureId, amount) {
  const weakness = Math.max(1, Number(amount || 1));
  const playerState = state[playerId];

  return {
    ...state,
    [playerId]: removeDeadCreatures({
      ...playerState,
      battlefield: playerState.battlefield.map((creature) =>
        creature.instanceId === creatureId
          ? {
              ...creature,
              attack: Math.max(0, creature.attack - weakness),
              currentHealth: creature.currentHealth - weakness,
              health: Math.max(1, creature.health - weakness),
              maxHealth: Math.max(1, creature.maxHealth - weakness),
            }
          : creature,
      ),
    }),
  };
}

function debuffCreature(state, playerId, creatureId, effect) {
  const attackPenalty = Math.max(0, Number(effect.attackPenalty ?? effect.amount ?? 1));
  const healthPenalty = Math.max(1, Number(effect.healthPenalty ?? effect.amount ?? 1));
  const playerState = state[playerId];

  return {
    ...state,
    [playerId]: removeDeadCreatures({
      ...playerState,
      battlefield: playerState.battlefield.map((creature) =>
        creature.instanceId === creatureId
          ? {
              ...creature,
              attack: Math.max(0, creature.attack - attackPenalty),
              currentHealth: creature.currentHealth - healthPenalty,
              health: Math.max(1, creature.health - healthPenalty),
              maxHealth: Math.max(1, creature.maxHealth - healthPenalty),
            }
          : creature,
      ),
    }),
  };
}

function bounceCreature(state, playerId, creatureId) {
  const playerState = state[playerId];
  const bouncedCreature = playerState.battlefield.find((creature) => creature.instanceId === creatureId);

  if (!bouncedCreature) return state;

  const handCard = {
    ...bouncedCreature,
    canAttack: undefined,
    currentHealth: undefined,
    hasAttacked: undefined,
    instanceId: createId('hand'),
    shield: undefined,
    summonedThisTurn: undefined,
  };

  return {
    ...state,
    [playerId]: {
      ...playerState,
      battlefield: playerState.battlefield.filter((creature) => creature.instanceId !== creatureId),
      hand: [...playerState.hand, handCard],
    },
  };
}

function discardFromHand(state, playerId, amount = 1) {
  const playerState = state[playerId];
  const discardCount = Math.min(playerState.hand.length, Math.max(1, Number(amount || 1)));
  const hand = [...playerState.hand];
  const discardedCards = [];

  while (discardedCards.length < discardCount && hand.length) {
    const discardIndex = Math.floor(Math.random() * hand.length);
    discardedCards.push(hand[discardIndex]);
    hand.splice(discardIndex, 1);
  }

  if (!discardedCards.length) {
    return damagePlayer(state, playerId, 1);
  }

  return {
    ...state,
    [playerId]: {
      ...playerState,
      graveyard: [...playerState.graveyard, ...discardedCards],
      hand,
    },
  };
}

function reanimateCreature(state, playerId) {
  const playerState = state[playerId];
  const creature = [...playerState.graveyard]
    .filter((card) => card.type === 'creature' || card.type === 'Creature')
    .sort((a, b) => (b.attack || 0) + (b.health || 0) - ((a.attack || 0) + (a.health || 0)))[0];

  if (!creature) {
    return {
      ...state,
      [playerId]: {
        ...playerState,
        battlefield: [
          ...playerState.battlefield,
          createToken({ name: 'Spirit Token', rarity: 'common' }, { token: { attack: 2, health: 2, name: 'Spirit Token' } }),
        ],
      },
    };
  }

  return {
    ...state,
    [playerId]: {
      ...playerState,
      battlefield: [...playerState.battlefield, createBattlefieldCreature(creature, true)],
      graveyard: playerState.graveyard.filter((card) => card.instanceId !== creature.instanceId),
    },
  };
}

function createToken(card, effect) {
  const tokenData = effect.token || effect;
  const tokenName = tokenData.name || effect.name || 'Summoned Token';
  const token = {
    battleId: createId('token-card'),
    cost: 0,
    imageUrl: card.imageUrl,
    name: tokenName,
    rarity: card.rarity || 'common',
    type: 'creature',
    attack: Math.max(1, Number(tokenData.attack || 1)),
    health: Math.max(1, Number(tokenData.health || 1)),
    maxHealth: Math.max(1, Number(tokenData.health || 1)),
  };

  return createBattlefieldCreature(token, true);
}

export function createBattleLogEntry(message, type = 'info') {
  return {
    id: createId('log'),
    message,
    timestamp: new Date().toISOString(),
    type,
  };
}

export function createInitialBattleState(playerDeck, enemyDeck) {
  const playerShuffledDeck = shuffleDeck(playerDeck);
  const enemyShuffledDeck = shuffleDeck(enemyDeck);
  const initialState = {
    activePlayer: 'player',
    enemy: {
      battlefield: [],
      deck: enemyShuffledDeck.slice(STARTING_HAND_SIZE),
      graveyard: [],
      hand: enemyShuffledDeck.slice(0, STARTING_HAND_SIZE),
      health: STARTING_HEALTH,
      mana: STARTING_MANA,
      maxMana: STARTING_MANA,
    },
    id: createId('battle'),
    log: [createBattleLogEntry('Battle started. Each side drew 3 cards.', 'system')],
    player: {
      battlefield: [],
      deck: playerShuffledDeck.slice(STARTING_HAND_SIZE),
      graveyard: [],
      hand: playerShuffledDeck.slice(0, STARTING_HAND_SIZE),
      health: STARTING_HEALTH,
      mana: STARTING_MANA,
      maxMana: STARTING_MANA,
    },
    status: 'playing',
    turnNumber: 1,
  };

  return checkWinCondition(initialState);
}

export function drawCard(state, playerId) {
  if (!assertPlayerId(playerId) || state.status !== 'playing') return state;

  const nextState = cloneState(state);
  const playerState = nextState[playerId];

  if (!playerState.deck.length) {
    return appendLog(nextState, `${playerId === 'player' ? 'Player' : 'Enemy'} tried to draw, but the deck was empty.`, 'warning');
  }

  const [drawnCard, ...remainingDeck] = playerState.deck;
  nextState[playerId] = {
    ...playerState,
    deck: remainingDeck,
    hand: [...playerState.hand, drawnCard],
  };

  return appendLog(nextState, `${playerId === 'player' ? 'Player' : 'Enemy'} drew ${drawnCard.name}.`, 'draw');
}

export function startTurn(state, playerId) {
  if (!assertPlayerId(playerId) || state.status !== 'playing') return state;

  const nextState = cloneState(state);
  const playerState = nextState[playerId];
  const nextMaxMana = Math.min(MAX_MANA, playerState.maxMana + 1);
  const refreshedBattlefield = playerState.battlefield.map((creature) => ({
    ...creature,
    canAttack: !hasKeyword(creature, 'Defender'),
    hasAttacked: false,
    summonedThisTurn: false,
  }));
  const startedState = {
    ...nextState,
    activePlayer: playerId,
    [playerId]: {
      ...playerState,
      battlefield: refreshedBattlefield,
      mana: nextMaxMana,
      maxMana: nextMaxMana,
    },
  };

  const withLog = appendLog(startedState, `${playerId === 'player' ? 'Player' : 'Enemy'} turn started. Mana refilled to ${nextMaxMana}.`, 'turn');
  return drawCard(withLog, playerId);
}

export function endTurn(state) {
  if (state.status !== 'playing') return state;

  const currentPlayerId = state.activePlayer || 'player';
  const nextPlayerId = getOpponentId(currentPlayerId);
  const endedState = {
    ...cloneState(state),
    turnNumber: nextPlayerId === 'player' ? state.turnNumber + 1 : state.turnNumber,
  };
  const withLog = appendLog(endedState, `${currentPlayerId === 'player' ? 'Player' : 'Enemy'} ended the turn.`, 'turn');

  return startTurn(withLog, nextPlayerId);
}

export function playCard(state, playerId, handCardId, target) {
  if (!assertPlayerId(playerId) || state.status !== 'playing') return state;
  if (state.activePlayer !== playerId) {
    return appendLog(cloneState(state), 'It is not that player\'s turn.', 'warning');
  }

  const nextState = cloneState(state);
  const playerState = nextState[playerId];
  const handIndex = findCardIndex(playerState.hand, handCardId);

  if (handIndex < 0) {
    return appendLog(nextState, 'That card is not in hand.', 'warning');
  }

  const card = playerState.hand[handIndex];
  const cost = Math.max(0, Number(card.cost || 0));

  if (cost > playerState.mana) {
    return appendLog(nextState, `Not enough mana to play ${card.name}.`, 'warning');
  }

  const hand = playerState.hand.filter((_, index) => index !== handIndex);
  const spentManaState = {
    ...nextState,
    [playerId]: {
      ...playerState,
      hand,
      mana: playerState.mana - cost,
    },
  };

  if (isCreature(card)) {
    const creature = createBattlefieldCreature(card);
    const summonedState = {
      ...spentManaState,
      [playerId]: {
        ...spentManaState[playerId],
        battlefield: [...spentManaState[playerId].battlefield, creature],
      },
    };

    return appendLog(checkWinCondition(summonedState), `${playerId === 'player' ? 'Player' : 'Enemy'} summoned ${card.name}.`, 'summon');
  }

  const resolvedState = resolveCardEffect(spentManaState, playerId, card, target);
  const graveyardState = {
    ...resolvedState,
    [playerId]: {
      ...resolvedState[playerId],
      graveyard: [...resolvedState[playerId].graveyard, card],
    },
  };

  return appendLog(checkWinCondition(graveyardState), `${playerId === 'player' ? 'Player' : 'Enemy'} cast ${card.name}.`, 'spell');
}

export function attackWithCreature(state, playerId, creatureId, target) {
  if (!assertPlayerId(playerId) || state.status !== 'playing') return state;
  if (state.activePlayer !== playerId) {
    return appendLog(cloneState(state), 'It is not that player\'s turn.', 'warning');
  }

  const opponentId = getOpponentId(playerId);
  const normalizedTarget = normalizeTarget(target);
  const nextState = cloneState(state);
  const attackerIndex = findCardIndex(nextState[playerId].battlefield, creatureId);

  if (attackerIndex < 0) {
    return appendLog(nextState, 'That creature is not on the battlefield.', 'warning');
  }

  const attacker = nextState[playerId].battlefield[attackerIndex];

  if (hasKeyword(attacker, 'Defender')) {
    return appendLog(nextState, `${attacker.name} has defender and cannot attack.`, 'warning');
  }

  if (!attacker.canAttack || attacker.hasAttacked) {
    return appendLog(nextState, `${attacker.name} is not ready to attack.`, 'warning');
  }

  nextState[playerId].battlefield[attackerIndex] = {
    ...attacker,
    canAttack: hasKeyword(attacker, 'Vigilance'),
    hasAttacked: true,
  };

  if (normalizedTarget.type === 'creature') {
    const defenderIndex = findCardIndex(nextState[opponentId].battlefield, normalizedTarget.creatureId || normalizedTarget.instanceId);

    if (defenderIndex < 0) {
      return appendLog(nextState, 'No enemy creature was found for that attack.', 'warning');
    }

    const defender = nextState[opponentId].battlefield[defenderIndex];
    const attackerDamage = Math.max(0, Number(attacker.attack || 0));
    const defenderDamage = Math.max(0, Number(defender.attack || 0));
    const defenderStartingHealth = defender.currentHealth;
    let updatedAttacker = nextState[playerId].battlefield[attackerIndex];
    let updatedDefender = defender;
    const hasFirstStrike = hasKeyword(attacker, 'First strike');

    updatedDefender = applyDamageToCreature(updatedDefender, attackerDamage);

    if (hasKeyword(attacker, 'Deathtouch') && attackerDamage > 0) {
      updatedDefender = { ...updatedDefender, currentHealth: 0 };
    }

    const firstStrikeKills = hasFirstStrike && updatedDefender.currentHealth <= 0;

    if (!firstStrikeKills && updatedDefender.currentHealth > 0) {
      updatedAttacker = applyDamageToCreature(updatedAttacker, defenderDamage);

      if (hasKeyword(defender, 'Deathtouch') && defenderDamage > 0) {
        updatedAttacker = { ...updatedAttacker, currentHealth: 0 };
      }
    }

    nextState[playerId].battlefield[attackerIndex] = updatedAttacker;
    nextState[opponentId].battlefield[defenderIndex] = updatedDefender;

    let combatState = nextState;

    if (hasKeyword(attacker, 'Trample') && attackerDamage > defenderStartingHealth) {
      combatState = damagePlayer(combatState, opponentId, attackerDamage - defenderStartingHealth);
    }

    combatState = applyLifelink(combatState, playerId, attacker, attackerDamage);
    combatState[playerId] = removeDeadCreatures(combatState[playerId]);
    combatState[opponentId] = removeDeadCreatures(combatState[opponentId]);

    return appendLog(checkWinCondition(combatState), `${attacker.name} battled ${defender.name}.`, 'damage');
  }

  const attackDamage = getPlayerAttackDamage(attacker);
  const damagedState = applyLifelink(damagePlayer(nextState, opponentId, attackDamage), playerId, attacker, attackDamage);
  return appendLog(checkWinCondition(damagedState), `${attacker.name} attacked for ${attackDamage} damage.`, 'damage');
}

export function resolveCardEffect(state, playerId, card, target) {
  if (!assertPlayerId(playerId) || state.status !== 'playing') return state;

  const opponentId = getOpponentId(playerId);
  const normalizedTarget = normalizeTarget(target);
  const effects = Array.isArray(card.effects) && card.effects.length
    ? card.effects
    : [{ amount: Math.max(1, Math.ceil((card.cost || 1) / 2)), target: 'enemy', type: 'damage' }];

  let nextState = cloneState(state);

  effects.forEach((effect) => {
    if (effect.type === 'damage') {
      if (normalizedTarget.type === 'creature') {
        nextState = damageCreature(nextState, opponentId, normalizedTarget.creatureId || normalizedTarget.instanceId, effect.amount);
      } else {
        nextState = damagePlayer(nextState, opponentId, effect.amount);
      }
      nextState = appendLog(nextState, `${card.name} dealt ${effect.amount || 1} damage.`, 'damage');
      return;
    }

    if (effect.type === 'heal') {
      nextState = healPlayer(nextState, playerId, effect.amount);
      nextState = appendLog(nextState, `${card.name} healed ${effect.amount || 1}.`, 'heal');
      return;
    }

    if (effect.type === 'drain') {
      nextState = damagePlayer(nextState, opponentId, effect.amount);
      nextState = healPlayer(nextState, playerId, Math.max(1, effect.amount || 1));
      nextState = appendLog(nextState, `${card.name} drained ${effect.amount || 1}.`, 'heal');
      return;
    }

    if (effect.type === 'draw') {
      for (let drawCount = 0; drawCount < Math.max(1, effect.amount || 1); drawCount += 1) {
        nextState = drawCard(nextState, playerId);
      }
      return;
    }

    if (effect.type === 'buff' || effect.type === 'artifactBuff') {
      const friendlyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[playerId].battlefield[0]?.instanceId;
      if (friendlyTargetId) {
        nextState = buffCreature(nextState, playerId, friendlyTargetId, effect);
        nextState = appendLog(nextState, `${card.name} buffed a creature.`, 'spell');
      }
      return;
    }

    if (effect.type === 'teamBuff') {
      nextState[playerId].battlefield.forEach((creature) => {
        nextState = buffCreature(nextState, playerId, creature.instanceId, effect);
      });
      nextState = appendLog(nextState, `${card.name} strengthened your team.`, 'spell');
      return;
    }

    if (effect.type === 'debuff') {
      const enemyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[opponentId].battlefield[0]?.instanceId;
      if (enemyTargetId) {
        nextState = debuffCreature(nextState, opponentId, enemyTargetId, effect);
        nextState = appendLog(nextState, `${card.name} weakened an enemy creature.`, 'damage');
      }
      return;
    }

    if (effect.type === 'shield') {
      const friendlyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[playerId].battlefield[0]?.instanceId;
      if (friendlyTargetId) {
        nextState = shieldCreature(nextState, playerId, friendlyTargetId, effect.amount);
        nextState = appendLog(nextState, `${card.name} shielded a creature.`, 'heal');
      } else {
        nextState = healPlayer(nextState, playerId, effect.amount);
        nextState = appendLog(nextState, `${card.name} restored ${effect.amount || 1} health.`, 'heal');
      }
      return;
    }

    if (effect.type === 'weaken' || effect.type === 'removal' || effect.type === 'weakenCreature' || effect.type === 'removeCreature') {
      const enemyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[opponentId].battlefield[0]?.instanceId;
      if (enemyTargetId) {
        nextState = ['removal', 'removeCreature'].includes(effect.type) && effect.amount === undefined
          ? removeCreature(nextState, opponentId, enemyTargetId)
          : effect.type === 'weakenCreature'
            ? weakenCreature(nextState, opponentId, enemyTargetId, effect.amount || 1)
            : damageCreature(nextState, opponentId, enemyTargetId, effect.amount || 99);
        nextState = appendLog(nextState, `${card.name} struck an enemy creature.`, ['removal', 'removeCreature'].includes(effect.type) ? 'destroy' : 'damage');
      } else {
        nextState = damagePlayer(nextState, opponentId, Math.max(1, Math.floor((effect.amount || 1) / 2)));
        nextState = appendLog(nextState, `${card.name} hit the opposing player.`, 'damage');
      }
      return;
    }

    if (effect.type === 'bounce') {
      const enemyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[opponentId].battlefield[0]?.instanceId;
      if (enemyTargetId) {
        nextState = bounceCreature(nextState, opponentId, enemyTargetId);
        nextState = appendLog(nextState, `${card.name} bounced an enemy creature.`, 'spell');
      }
      return;
    }

    if (effect.type === 'discard') {
      nextState = discardFromHand(nextState, opponentId, effect.amount);
      nextState = appendLog(nextState, `${card.name} forced a discard.`, 'spell');
      return;
    }

    if (effect.type === 'reanimate') {
      nextState = reanimateCreature(nextState, playerId);
      nextState = appendLog(nextState, `${card.name} returned a creature from the graveyard.`, 'summon');
      return;
    }

    if (effect.type === 'token' || effect.type === 'createToken') {
      const tokenCount = Math.min(3, Math.max(1, Number(effect.amount || 1)));
      for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex += 1) {
        nextState = {
          ...nextState,
          [playerId]: {
            ...nextState[playerId],
            battlefield: [...nextState[playerId].battlefield, createToken(card, effect)],
          },
        };
      }
      nextState = appendLog(nextState, `${card.name} created a token.`, 'summon');
      return;
    }

    if (effect.type === 'manaBoost') {
      nextState = {
        ...nextState,
        [playerId]: {
          ...nextState[playerId],
          mana: Math.min(MAX_MANA, nextState[playerId].mana + Math.max(1, effect.amount || 1)),
        },
      };
      nextState = appendLog(nextState, `${card.name} added mana.`, 'spell');
      return;
    }

    if (effect.type === 'flex') {
      const amount = Math.max(1, effect.amount || 1);
      const enemyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[opponentId].battlefield[0]?.instanceId;
      const friendlyTargetId = normalizedTarget.creatureId || normalizedTarget.instanceId || nextState[playerId].battlefield[0]?.instanceId;

      if (nextState[opponentId].health <= amount + 1) {
        nextState = damagePlayer(nextState, opponentId, amount + 1);
        nextState = appendLog(nextState, `${card.name} chose flexible damage.`, 'damage');
      } else if (enemyTargetId && nextState[opponentId].battlefield.length >= nextState[playerId].battlefield.length) {
        nextState = damageCreature(nextState, opponentId, enemyTargetId, amount + 1);
        nextState = appendLog(nextState, `${card.name} weakened the opposing board.`, 'damage');
      } else if (nextState[playerId].hand.length <= 2 && nextState[playerId].deck.length) {
        nextState = drawCard(nextState, playerId);
        nextState = appendLog(nextState, `${card.name} found a card.`, 'draw');
      } else if (friendlyTargetId) {
        nextState = shieldCreature(nextState, playerId, friendlyTargetId, amount);
        nextState = appendLog(nextState, `${card.name} protected a creature.`, 'heal');
      } else {
        nextState = damagePlayer(nextState, opponentId, amount);
        nextState = appendLog(nextState, `${card.name} released flexible magic.`, 'damage');
      }
      return;
    }

    if (effect.type === 'generic') {
      nextState = damagePlayer(nextState, opponentId, Math.max(1, effect.amount || 1));
      nextState = appendLog(nextState, `${card.name} dealt ${effect.amount || 1} damage.`, 'damage');
    }
  });

  return checkWinCondition(nextState);
}

export function checkWinCondition(state) {
  if (state.player.health <= 0 && state.enemy.health <= 0) {
    return appendLog({ ...state, status: 'lost' }, 'Both players fell. Binder Battle ends in defeat.', 'defeat');
  }

  if (state.enemy.health <= 0) {
    return appendLog({ ...state, status: 'won' }, 'Enemy defeated. You won the battle.', 'victory');
  }

  if (state.player.health <= 0) {
    return appendLog({ ...state, status: 'lost' }, 'Your health hit 0. You lost the battle.', 'defeat');
  }

  return {
    ...state,
    status: 'playing',
  };
}
