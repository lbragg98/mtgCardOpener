// PvP battle play screen syncs match state through Supabase and can pilot friend decks with AI.
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlagIcon from '@mui/icons-material/Flag';
import ReplayIcon from '@mui/icons-material/Replay';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SyncIcon from '@mui/icons-material/Sync';
import { Alert, Box, Button, Card, CardContent, Chip, Snackbar, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  forfeitBattleMatch,
  getBattleMatch,
  submitBattleAction,
} from '../api/pvpBattle.js';
import BattleBoard from '../components/battle/BattleBoard.jsx';
import BattleCardInspectionDialog from '../components/battle/BattleCardInspectionDialog.jsx';
import TargetPickerDialog from '../components/battle/TargetPickerDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { attackWithCreature, endTurn, playCard } from '../utils/battleEngine.js';
import { executeAIAction, takeAITurn } from '../utils/battleAI.js';
import {
  createBattleAnimationEvent,
  getPlayAnimationType,
  getPrimaryEffectAmount,
  getPrimaryEffectType,
} from '../utils/battleAnimationQueue.js';
import { getAnimationSpeedMultiplier, getBattleSettings } from '../utils/battleSettings.js';
import { getDeckStrategy } from '../utils/deckBalance.js';

function normalizeMatch(row) {
  if (!row) return null;

  return {
    ...row,
    aiControlledUserId: row.aiControlledUserId || row.ai_controlled_user_id,
    aiDifficulty: row.aiDifficulty || row.ai_difficulty || 'normal',
    challengeId: row.challengeId || row.challenge_id,
    currentTurnUserId: row.currentTurnUserId || row.current_turn_user_id,
    gameState: row.gameState || row.game_state || {},
    lastAction: row.lastAction || row.last_action || {},
    playerOneDeck: row.playerOneDeck || row.player_one_deck || [],
    playerOneId: row.playerOneId || row.player_one_id,
    playerTwoDeck: row.playerTwoDeck || row.player_two_deck || [],
    playerTwoId: row.playerTwoId || row.player_two_id,
    turnNumber: row.turnNumber || row.turn_number,
    winnerId: row.winnerId || row.winner_id,
  };
}

function getOpponentId(match, userId) {
  if (!match || !userId) return null;
  return match.playerOneId === userId ? match.playerTwoId : match.playerOneId;
}

function needsTarget(card) {
  const effects = card.effects || [];
  const effectTypes = effects.map((effect) => effect.type);
  const targetTypes = effects.map((effect) => effect.targetType || effect.target);

  return targetTypes.some((type) => ['enemyAny', 'enemyCreature', 'friendlyCreature'].includes(type)) ||
    effectTypes.some((type) => ['bounce', 'buff', 'artifactBuff', 'damage', 'debuff', 'discard', 'drain', 'removal', 'removeCreature', 'shield', 'weaken', 'weakenCreature'].includes(type));
}

function getTargetOptions(state, playerId, card, mode) {
  const opponentId = playerId === 'player' ? 'enemy' : 'player';

  if (mode === 'attack') {
    return [
      { id: `${opponentId}-player`, label: opponentId === 'enemy' ? 'Enemy Player' : 'Player', value: { playerId: opponentId, type: 'player' } },
      ...state[opponentId].battlefield.map((creature) => ({
        card: creature,
        id: creature.instanceId,
        value: { creatureId: creature.instanceId, type: 'creature' },
      })),
    ];
  }

  const effects = card.effects || [];
  const effectTypes = effects.map((effect) => effect.type);
  const targetTypes = effects.map((effect) => effect.targetType || effect.target);

  if (effectTypes.includes('buff') || effectTypes.includes('artifactBuff') || effectTypes.includes('shield') || targetTypes.includes('friendlyCreature')) {
    return state[playerId].battlefield.map((creature) => ({
      card: creature,
      id: creature.instanceId,
      value: { creatureId: creature.instanceId, type: 'creature' },
    }));
  }

  if (effectTypes.includes('bounce') || effectTypes.includes('debuff') || effectTypes.includes('removal') || effectTypes.includes('removeCreature') || targetTypes.includes('enemyCreature')) {
    return state[opponentId].battlefield.map((creature) => ({
      card: creature,
      id: creature.instanceId,
      value: { creatureId: creature.instanceId, type: 'creature' },
    }));
  }

  if (effectTypes.includes('damage') || effectTypes.includes('discard') || effectTypes.includes('drain') || effectTypes.includes('weaken') || effectTypes.includes('weakenCreature') || targetTypes.includes('enemyAny')) {
    return [
      { id: `${opponentId}-player`, label: opponentId === 'enemy' ? 'Enemy Player' : 'Player', value: { playerId: opponentId, type: 'player' } },
      ...state[opponentId].battlefield.map((creature) => ({
        card: creature,
        id: creature.instanceId,
        value: { creatureId: creature.instanceId, type: 'creature' },
      })),
    ];
  }

  return [];
}

function getDisplayState(gameState, actualPlayerKey) {
  if (actualPlayerKey === 'player') {
    return {
      activePlayer: gameState.activePlayer,
      enemy: gameState.enemy,
      player: gameState.player,
    };
  }

  return {
    activePlayer: gameState.activePlayer === 'enemy' ? 'player' : 'enemy',
    enemy: gameState.player,
    player: gameState.enemy,
  };
}

function getProfileName(profile, fallback = 'Opponent') {
  return profile?.display_name || profile?.displayName || profile?.username || fallback;
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function findCardByAction(state, action) {
  if (!state || !action) return null;

  if (action.type === 'playCard') {
    return state[action.playerKey || 'enemy']?.hand?.find((card) =>
      [card.instanceId, card.battleId, card.userCardId, card.id, card.scryfallId].filter(Boolean).includes(action.cardId),
    ) || null;
  }

  if (action.type === 'attack') {
    return state[action.playerKey || 'enemy']?.battlefield?.find((card) =>
      [card.instanceId, card.battleId, card.userCardId, card.id, card.scryfallId].filter(Boolean).includes(action.creatureId),
    ) || null;
  }

  return null;
}

function createAIAnimationEvent(state, action) {
  const card = findCardByAction(state, action);

  if (action.type === 'endTurn') {
    return createBattleAnimationEvent('turnBanner', {
      amount: null,
      effectType: 'turn',
      sourceZone: 'enemy',
      targetZone: 'player',
    });
  }

  if (!card) return null;

  if (action.type === 'attack') {
    return createBattleAnimationEvent('attack', {
      amount: card.attack || 1,
      card,
      effectType: 'damage',
      sourceZone: 'enemy',
      targetId: action.targetId,
      targetZone: action.target?.playerId === 'player' ? 'player' : 'center',
    });
  }

  return createBattleAnimationEvent(getPlayAnimationType(card), {
    amount: getPrimaryEffectAmount(card),
    card,
    effectType: getPrimaryEffectType(card),
    sourceZone: 'enemy',
    targetId: action.targetId,
    targetZone: action.target?.playerId === 'player' ? 'player' : action.target?.creatureId ? 'center' : 'enemy',
  });
}

export default function PvpBattlePlay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [opponentProfile, setOpponentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [targetPicker, setTargetPicker] = useState(null);
  const [inspectedCard, setInspectedCard] = useState(null);
  const [animationEvents, setAnimationEvents] = useState([]);
  const [settings, setSettings] = useState(() => getBattleSettings());
  const aiTurnInProgressRef = useRef(false);
  const lastProcessedAITurnRef = useRef('');
  const aiTimerRef = useRef(null);
  const animationSpeed = getAnimationSpeedMultiplier(settings.animationSpeed);

  const userId = currentUser?.id;
  const normalizedMatch = useMemo(() => normalizeMatch(match), [match]);
  const gameState = normalizedMatch?.gameState;
  const actualPlayerKey = normalizedMatch?.playerOneId === userId ? 'player' : 'enemy';
  const displayState = gameState ? getDisplayState(gameState, actualPlayerKey) : null;
  const isParticipant = normalizedMatch && userId && [normalizedMatch.playerOneId, normalizedMatch.playerTwoId].includes(userId);
  const isAITurn = normalizedMatch?.mode === 'ai_friend_deck' && gameState?.activePlayer === 'enemy' && gameState?.status === 'playing';
  const canAct = Boolean(
    normalizedMatch &&
    gameState?.status === 'playing' &&
    isParticipant &&
    normalizedMatch.currentTurnUserId === userId &&
    gameState.activePlayer === actualPlayerKey &&
    !isAITurn &&
    !isSavingAction,
  );
  const isMatchComplete = gameState?.status && gameState.status !== 'playing';
  const userWon = (actualPlayerKey === 'player' && gameState?.status === 'won') || (actualPlayerKey === 'enemy' && gameState?.status === 'lost');
  const userDeck = actualPlayerKey === 'player' ? normalizedMatch?.playerOneDeck : normalizedMatch?.playerTwoDeck;
  const opponentDeck = actualPlayerKey === 'player' ? normalizedMatch?.playerTwoDeck : normalizedMatch?.playerOneDeck;
  const userDeckStrategy = getDeckStrategy(userDeck || []);
  const opponentDeckStrategy = getDeckStrategy(opponentDeck || []);

  useEffect(() => {
    function refreshSettings() {
      setSettings(getBattleSettings());
    }

    window.addEventListener('battleSettingsUpdated', refreshSettings);
    window.addEventListener('storage', refreshSettings);
    return () => {
      window.removeEventListener('battleSettingsUpdated', refreshSettings);
      window.removeEventListener('storage', refreshSettings);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMatch() {
      try {
        setIsLoading(true);
        setError('');
        const [{ data: userData, error: userError }, matchResult] = await Promise.all([
          supabase.auth.getUser(),
          getBattleMatch(matchId),
        ]);

        if (userError || !userData.user) {
          throw new Error('You need to be logged in to play this match.');
        }

        if (!isMounted) return;
        const nextMatch = normalizeMatch(matchResult);
        const opponentId = getOpponentId(nextMatch, userData.user.id);
        setCurrentUser(userData.user);
        setMatch(nextMatch);

        if (opponentId) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', opponentId).maybeSingle();
          if (isMounted) setOpponentProfile(profile || null);
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Unable to load PvP battle match.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMatch();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  function setLocalGameState(nextState) {
    setMatch((currentMatch) => {
      if (!currentMatch) return currentMatch;

      return {
        ...currentMatch,
        gameState: nextState,
        game_state: nextState,
      };
    });
  }

  function enqueueAnimation(event) {
    if (!event) return;

    setAnimationEvents((currentEvents) => [...currentEvents, event].slice(-4));
    window.setTimeout(() => {
      setAnimationEvents((currentEvents) => currentEvents.filter((queuedEvent) => queuedEvent.id !== event.id));
    }, Math.max(420, 980 * animationSpeed));
  }

  useEffect(() => {
    if (!matchId) return undefined;

    const channel = supabase
      .channel(`battle-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          filter: `id=eq.${matchId}`,
          schema: 'public',
          table: 'battle_matches',
        },
        (payload) => setMatch(normalizeMatch(payload.new)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function reloadMatch() {
    const refreshedMatch = await getBattleMatch(matchId);
    setMatch(refreshedMatch);
    return refreshedMatch;
  }

  async function persistAction(actionType, actionPayload, nextState, options = {}) {
    const updatedMatch = await submitBattleAction(matchId, actionType, actionPayload, nextState, options);
    setMatch(updatedMatch);
    return updatedMatch;
  }

  async function handlePlayCard(card) {
    if (!canAct || !gameState) return;

    if ((card.cost || 0) > gameState[actualPlayerKey].mana) {
      setSnackbar('Not enough mana.');
      return;
    }

    if (needsTarget(card)) {
      const targets = getTargetOptions(gameState, actualPlayerKey, card, 'play');
      if (!targets.length) {
        setSnackbar('No valid targets for that card.');
        return;
      }
      setTargetPicker({ actionLabel: `Choose target for ${card.name}`, card, mode: 'play', targets });
      return;
    }

    try {
      setIsSavingAction(true);
      const nextState = playCard(gameState, actualPlayerKey, card.instanceId);
      await persistAction('playCard', { cardId: card.instanceId, cardName: card.name, playerKey: actualPlayerKey }, nextState);
    } catch (actionError) {
      setSnackbar(actionError.message || 'Unable to play card.');
      await reloadMatch();
    } finally {
      setIsSavingAction(false);
    }
  }

  async function handleAttackCreature(creature) {
    if (!canAct || !gameState) return;

    if (!creature.canAttack || creature.hasAttacked) {
      setSnackbar(`${creature.name} is exhausted.`);
      return;
    }

    const targets = getTargetOptions(gameState, actualPlayerKey, creature, 'attack');
    if (gameState[actualPlayerKey === 'player' ? 'enemy' : 'player'].battlefield.length) {
      setTargetPicker({ actionLabel: `Choose attack target for ${creature.name}`, card: creature, mode: 'attack', targets });
      return;
    }

    try {
      setIsSavingAction(true);
      const nextState = attackWithCreature(gameState, actualPlayerKey, creature.instanceId, targets[0].value);
      await persistAction('attack', { creatureId: creature.instanceId, creatureName: creature.name, playerKey: actualPlayerKey, target: targets[0].value }, nextState);
    } catch (actionError) {
      setSnackbar(actionError.message || 'Unable to attack.');
      await reloadMatch();
    } finally {
      setIsSavingAction(false);
    }
  }

  async function handleTargetSelected(target) {
    const picker = targetPicker;
    setTargetPicker(null);
    if (!picker || !canAct || !gameState) return;

    try {
      setIsSavingAction(true);
      const nextState = picker.mode === 'attack'
        ? attackWithCreature(gameState, actualPlayerKey, picker.card.instanceId, target)
        : playCard(gameState, actualPlayerKey, picker.card.instanceId, target);
      await persistAction(picker.mode === 'attack' ? 'attack' : 'playCard', {
        cardId: picker.card.instanceId,
        cardName: picker.card.name,
        playerKey: actualPlayerKey,
        target,
      }, nextState);
    } catch (actionError) {
      setSnackbar(actionError.message || 'Unable to complete action.');
      await reloadMatch();
    } finally {
      setIsSavingAction(false);
    }
  }

  async function handleEndTurn() {
    if (!canAct || !gameState) return;

    try {
      setIsSavingAction(true);
      const nextState = endTurn(gameState);
      await persistAction('endTurn', { playerKey: actualPlayerKey }, nextState);
    } catch (actionError) {
      setSnackbar(actionError.message || 'Unable to end turn.');
      await reloadMatch();
    } finally {
      setIsSavingAction(false);
    }
  }

  async function handleForfeit() {
    if (!normalizedMatch || gameState?.status !== 'playing' || isSavingAction) return;

    try {
      setIsSavingAction(true);
      const updatedMatch = await forfeitBattleMatch(matchId);
      setMatch(updatedMatch);
      setSnackbar('Match forfeited.');
    } catch (forfeitError) {
      setSnackbar(forfeitError.message || 'Unable to forfeit match.');
      await reloadMatch();
    } finally {
      setIsSavingAction(false);
    }
  }

  async function runAITurn() {
    if (!normalizedMatch || !gameState || aiTurnInProgressRef.current) return;

    const turnKey = `${gameState.turnNumber}-${gameState.activePlayer}-${normalizedMatch.updated_at || normalizedMatch.updatedAt || ''}`;
    if (lastProcessedAITurnRef.current === turnKey) return;

    aiTurnInProgressRef.current = true;
    lastProcessedAITurnRef.current = turnKey;
    setIsAIThinking(true);

    try {
      const { actions } = takeAITurn(gameState, 'enemy', normalizedMatch.aiDifficulty);
      let animatedState = gameState;

      for (const action of actions) {
        const animationEvent = createAIAnimationEvent(animatedState, action);
        enqueueAnimation(animationEvent);
        await delay(action.type === 'endTurn' ? 520 : 720);
        animatedState = executeAIAction(animatedState, action);
        setLocalGameState(animatedState);
        await delay(action.type === 'endTurn' ? 220 : 360);
      }

      await persistAction('ai_turn', { actions, actionCount: actions.length }, animatedState);
    } catch (aiError) {
      lastProcessedAITurnRef.current = '';
      setSnackbar(aiError.message || 'AI turn failed. Try refreshing the match.');
      await reloadMatch();
    } finally {
      aiTurnInProgressRef.current = false;
      setIsAIThinking(false);
    }
  }

  useEffect(() => {
    if (!isAITurn || normalizedMatch?.aiControlledUserId !== normalizedMatch?.playerTwoId) return undefined;

    aiTimerRef.current = window.setTimeout(() => {
      runAITurn();
    }, 850);

    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    };
  }, [isAITurn, normalizedMatch?.id, normalizedMatch?.turnNumber, gameState?.turnNumber, gameState?.activePlayer]);

  if (isLoading) {
    return (
      <Box>
        <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle/pvp" variant="outlined" sx={{ mb: 3 }}>
          Back to Lobby
        </Button>
        <Alert severity="info">Loading PvP battle match...</Alert>
      </Box>
    );
  }

  if (error || !normalizedMatch || !gameState || !isParticipant) {
    return (
      <Box>
        <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle/pvp" variant="outlined" sx={{ mb: 3 }}>
          Back to Lobby
        </Button>
        <Alert severity="error">{error || 'This match was not found or you are not part of it.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle/pvp" variant="outlined" sx={{ mb: 3 }}>
        Back to Lobby
      </Button>
      <PageHeader eyebrow="Friend Battle" title={`Vs ${getProfileName(opponentProfile)}`}>
        Supabase-backed Binder Battle match.
      </PageHeader>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
              <Chip color={normalizedMatch.mode === 'ai_friend_deck' ? 'info' : 'default'} label={normalizedMatch.mode === 'ai_friend_deck' ? "AI using friend's deck" : 'Live PvP'} />
              {normalizedMatch.mode === 'ai_friend_deck' && (
                <Chip color="secondary" icon={<SmartToyIcon />} label={`${normalizedMatch.aiDifficulty} AI`} variant="outlined" />
              )}
              <Chip color={gameState.status === 'playing' ? 'success' : 'warning'} label={gameState.status} variant="outlined" />
              <Chip label={canAct ? 'Your turn' : isAIThinking ? 'Opponent is thinking...' : 'Waiting'} variant="outlined" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ alignItems: { sm: 'center' } }}>
              {isAIThinking && (
                <Stack direction="row" gap={1} sx={{ alignItems: 'center' }}>
                  <SyncIcon fontSize="small" />
                  <Typography color="text.secondary" variant="body2">Opponent is thinking...</Typography>
                </Stack>
              )}
              {isAITurn && !isAIThinking && (
                <Button disabled={isSavingAction} onClick={runAITurn} startIcon={<SmartToyIcon />} variant="outlined">
                  Retry AI Turn
                </Button>
              )}
              {gameState.status === 'playing' && (
                <Button color="error" disabled={isSavingAction || isAIThinking} onClick={handleForfeit} startIcon={<FlagIcon />} variant="outlined">
                  Forfeit
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {isMatchComplete && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'grid', gap: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <Box>
                <Typography variant="h4">{userWon ? 'Victory' : 'Defeat'}</Typography>
                <Typography color="text.secondary">
                  {getProfileName(opponentProfile)} - Turn {gameState.turnNumber || normalizedMatch.turnNumber || 1}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <Button component={Link} startIcon={<ReplayIcon />} to="/battle/pvp" variant="contained">
                  Rematch
                </Button>
                <Button component={Link} to="/battle/pvp" variant="outlined">
                  Back to Lobby
                </Button>
              </Stack>
            </Stack>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={`Your deck: ${userDeckStrategy}`} variant="outlined" />
              <Chip label={`Opponent deck: ${opponentDeckStrategy}`} variant="outlined" />
              <Chip label="PvP rewards not enabled yet" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>
      )}

      <BattleBoard
        activePlayer={canAct ? 'player' : displayState.activePlayer}
        animationEvents={animationEvents}
        animationSpeed={animationSpeed}
        enemy={displayState.enemy}
        enemyBadge={normalizedMatch.mode === 'ai_friend_deck' && actualPlayerKey === 'player' ? 'AI controlled' : ''}
        enemyName={getProfileName(opponentProfile)}
        log={gameState.log}
        onAttackCreature={handleAttackCreature}
        onEndTurn={handleEndTurn}
        onInspectCard={setInspectedCard}
        onPlayCard={handlePlayCard}
        player={displayState.player}
        playerName="You"
        status={gameState.status}
        showHelpTips={settings.showHelpTips}
        turnNumber={gameState.turnNumber}
      />

      <TargetPickerDialog
        actionLabel={targetPicker?.actionLabel || 'Choose target'}
        onClose={() => setTargetPicker(null)}
        onSelectTarget={handleTargetSelected}
        open={Boolean(targetPicker)}
        targets={targetPicker?.targets || []}
      />
      <BattleCardInspectionDialog card={inspectedCard} onClose={() => setInspectedCard(null)} open={Boolean(inspectedCard)} />
      <Snackbar autoHideDuration={3600} message={snackbar} onClose={() => setSnackbar('')} open={Boolean(snackbar)} />
    </Box>
  );
}
