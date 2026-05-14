import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BattleBoard from '../components/battle/BattleBoard.jsx';
import BattleCardInspectionDialog from '../components/battle/BattleCardInspectionDialog.jsx';
import TargetPickerDialog from '../components/battle/TargetPickerDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import {
  attackWithCreature,
  createInitialBattleState,
  playCard,
} from '../utils/battleEngine.js';
import { fetchRedStarterEnemyDeck } from '../api/scryfallEnemyDeck.js';
import { createFallbackEnemyDeck, takeEnemyTurn } from '../utils/battleAI.js';
import { mapCollectionCardToBattleCard } from '../utils/battleCardMapper.js';
import { getSavedBattleDeck } from '../utils/battleDeckStorage.js';
import { calculateBattleReward, getBattleRewardStatus, recordBattleReward } from '../utils/battleRewards.js';
import { getAnimationSpeedMultiplier, getBattleSettings } from '../utils/battleSettings.js';
import {
  createBattleAnimationEvent,
  getPlayAnimationType,
  getPrimaryEffectAmount,
  getPrimaryEffectType,
} from '../utils/battleAnimationQueue.js';

function prepareDeck(deck) {
  return deck.map((card) => (card?.type && card?.cost !== undefined ? { ...card } : mapCollectionCardToBattleCard(card)));
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

export default function BattlePlay() {
  const savedDeck = useMemo(() => prepareDeck(getSavedBattleDeck()), []);
  const [settings, setSettings] = useState(() => getBattleSettings());
  const animationSpeed = getAnimationSpeedMultiplier(settings.animationSpeed);
  const [battleState, setBattleState] = useState(null);
  const [isLoadingEnemyDeck, setIsLoadingEnemyDeck] = useState(savedDeck.length === 20);
  const [inspectedCard, setInspectedCard] = useState(null);
  const [animationEvents, setAnimationEvents] = useState([]);
  const [targetPicker, setTargetPicker] = useState(null);
  const [resultReward, setResultReward] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  function enqueueAnimation(event) {
    setAnimationEvents((currentEvents) => [...currentEvents, event].slice(-4));
    window.setTimeout(() => {
      setAnimationEvents((currentEvents) => currentEvents.filter((queuedEvent) => queuedEvent.id !== event.id));
    }, 980 * animationSpeed);
  }

  function createPlayEvent(card, { sourceZone = 'playerHand', target } = {}) {
    const effectType = getPrimaryEffectType(card);
    const targetZone = target?.playerId === 'player' || ['heal', 'shield', 'buff', 'artifactBuff', 'teamBuff', 'draw', 'manaBoost', 'reanimate'].includes(effectType)
      ? 'player'
      : 'enemy';

    return createBattleAnimationEvent(getPlayAnimationType(card), {
      amount: getPrimaryEffectAmount(card),
      card,
      effectType,
      sourceZone,
      targetId: target?.creatureId || target?.playerId,
      targetZone,
    });
  }

  function createAttackEvent(card, target) {
    return createBattleAnimationEvent('attack', {
      amount: card.attack || 1,
      card,
      effectType: 'damage',
      sourceZone: 'playerBattlefield',
      targetId: target?.creatureId || target?.playerId,
      targetZone: target?.playerId === 'enemy' || target?.type === 'player' ? 'enemy' : 'center',
    });
  }

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

    async function loadBattle() {
      if (savedDeck.length !== 20) {
        setBattleState(null);
        setIsLoadingEnemyDeck(false);
        return;
      }

      try {
        setIsLoadingEnemyDeck(true);
        const enemyDeck = ['easy', 'normal'].includes(settings.difficulty)
          ? await fetchRedStarterEnemyDeck()
          : createFallbackEnemyDeck(savedDeck, settings.difficulty);

        if (!isMounted) return;
        setBattleState(createInitialBattleState(savedDeck, enemyDeck.length === 20 ? enemyDeck : createFallbackEnemyDeck(savedDeck, settings.difficulty)));
      } catch (error) {
        console.warn('Using fallback enemy deck because Scryfall enemy deck failed.', error);
        if (isMounted) {
          setBattleState(createInitialBattleState(savedDeck, createFallbackEnemyDeck(savedDeck, settings.difficulty)));
        }
      } finally {
        if (isMounted) {
          setIsLoadingEnemyDeck(false);
        }
      }
    }

    loadBattle();

    return () => {
      isMounted = false;
    };
  }, [savedDeck, settings.difficulty]);

  useEffect(() => {
    if (!battleState || battleState.status === 'playing' || resultReward) {
      return;
    }

    const rewardResult = calculateBattleReward(battleState.status, savedDeck, battleState);
    const recordedReward = recordBattleReward(rewardResult.amount, rewardResult.result);
    setResultReward({
      ...rewardResult,
      dailyStatusAfterReward: recordedReward,
      newShardBalance: recordedReward.newShardBalance,
    });

    setSnackbar(
      recordedReward.amount > 0
        ? `Battle complete: earned ${recordedReward.amount} Pack Shards.`
        : 'Battle complete: daily reward limit reached.',
    );
  }, [battleState, resultReward, savedDeck]);

  function handlePlayCard(card) {
    if (!battleState || battleState.activePlayer !== 'player' || battleState.status !== 'playing') return;

    if ((card.cost || 0) > battleState.player.mana) {
      setSnackbar('Not enough mana.');
      return;
    }

    if (needsTarget(card)) {
      const targets = getTargetOptions(battleState, 'player', card, 'play');
      if (!targets.length) {
        setSnackbar('No valid targets for that card.');
        return;
      }

      setTargetPicker({
        actionLabel: `Choose target for ${card.name}`,
        card,
        mode: 'play',
        targets,
      });
      return;
    }

    enqueueAnimation(createPlayEvent(card));
    setBattleState((currentState) => playCard(currentState, 'player', card.instanceId));
  }

  function handleAttackCreature(creature) {
    if (!battleState || battleState.activePlayer !== 'player' || battleState.status !== 'playing') return;

    if (!creature.canAttack || creature.hasAttacked) {
      setSnackbar(`${creature.name} is exhausted.`);
      return;
    }

    const targets = getTargetOptions(battleState, 'player', creature, 'attack');
    if (battleState.enemy.battlefield.length) {
      setTargetPicker({
        actionLabel: `Choose attack target for ${creature.name}`,
        card: creature,
        mode: 'attack',
        targets,
      });
      return;
    }

    enqueueAnimation(createAttackEvent(creature, targets[0].value));
    setBattleState((currentState) => attackWithCreature(currentState, 'player', creature.instanceId, targets[0].value));
  }

  function handleTargetSelected(target) {
    const picker = targetPicker;
    setTargetPicker(null);

    if (!picker) return;

    setBattleState((currentState) => {
      if (!currentState) return currentState;
      if (picker.mode === 'attack') {
        enqueueAnimation(createAttackEvent(picker.card, target));
        return attackWithCreature(currentState, 'player', picker.card.instanceId, target);
      }

      enqueueAnimation(createPlayEvent(picker.card, { target }));
      return playCard(currentState, 'player', picker.card.instanceId, target);
    });
  }

  function handleEndTurn() {
    setTargetPicker(null);
    enqueueAnimation(createBattleAnimationEvent('enemyTurn', {
      amount: 1,
      effectType: 'damage',
      sourceZone: 'enemy',
      targetZone: 'player',
    }));
    setBattleState((currentState) => {
      if (!currentState || currentState.activePlayer !== 'player' || currentState.status !== 'playing') return currentState;
      return takeEnemyTurn(currentState, settings.difficulty);
    });
  }

  useEffect(() => {
    if (!settings.autoEndTurn || !battleState || battleState.status !== 'playing' || battleState.activePlayer !== 'player') {
      return undefined;
    }

    const hasPlayableCard = battleState.player.hand.some((card) => (card.cost || 0) <= battleState.player.mana);
    const hasReadyCreature = battleState.player.battlefield.some((card) => card.canAttack && !card.hasAttacked);

    if (hasPlayableCard || hasReadyCreature) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setBattleState((currentState) => (
        currentState?.activePlayer === 'player' && currentState.status === 'playing'
          ? (() => {
              enqueueAnimation(createBattleAnimationEvent('enemyTurn', {
                amount: 1,
                effectType: 'damage',
                sourceZone: 'enemy',
                targetZone: 'player',
              }));
              return takeEnemyTurn(currentState, settings.difficulty);
            })()
          : currentState
      ));
    }, 650 * animationSpeed);

    return () => window.clearTimeout(timer);
  }, [animationSpeed, battleState, settings.autoEndTurn, settings.difficulty]);

  function handleBattleAgain() {
    setTargetPicker(null);
    setResultReward(null);
    setBattleState(null);
    setIsLoadingEnemyDeck(true);
    const enemyDeckPromise = ['easy', 'normal'].includes(settings.difficulty)
      ? fetchRedStarterEnemyDeck()
      : Promise.resolve(createFallbackEnemyDeck(savedDeck, settings.difficulty));

    enemyDeckPromise
      .then((enemyDeck) => {
        setBattleState(createInitialBattleState(savedDeck, enemyDeck.length === 20 ? enemyDeck : createFallbackEnemyDeck(savedDeck, settings.difficulty)));
      })
      .catch((error) => {
        console.warn('Using fallback enemy deck because Scryfall enemy deck failed.', error);
        setBattleState(createInitialBattleState(savedDeck, createFallbackEnemyDeck(savedDeck, settings.difficulty)));
      })
      .finally(() => setIsLoadingEnemyDeck(false));
  }

  if (savedDeck.length !== 20 || !battleState) {
    return (
      <Box>
        <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle" variant="outlined" sx={{ mb: 3 }}>
          Back to Battle
        </Button>
        <Alert severity={savedDeck.length === 20 && isLoadingEnemyDeck ? 'info' : 'warning'} variant="outlined">
          {savedDeck.length === 20 && isLoadingEnemyDeck
            ? 'Loading the red starter enemy deck from Scryfall...'
            : 'Build and save a 20-card deck before starting Binder Battle.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle" variant="outlined" sx={{ mb: 3 }}>
        Back to Battle
      </Button>
      <PageHeader eyebrow="Binder Battle" title="Battle Play">
        Play a full simplified battle using your saved 20-card deck.
      </PageHeader>

      {battleState.status !== 'playing' && (
        <Card
          animate={{ opacity: 1, scale: 1, y: 0 }}
          component={motion.div}
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          sx={{ mb: 3, borderColor: battleState.status === 'won' ? 'success.main' : 'error.main' }}
          transition={{ duration: 0.28 * animationSpeed, ease: 'easeOut' }}
        >
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="h4">{battleState.status === 'won' ? 'Victory' : 'Defeat'}</Typography>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
              <Card variant="outlined" sx={{ flex: '1 1 160px', bgcolor: 'rgba(255,255,255,0.025)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography color="text.secondary" variant="caption">Shards Earned</Typography>
                  <Typography fontWeight={950} variant="h5">{resultReward?.amount ?? 0}</Typography>
                  {resultReward?.capped && (
                    <Typography color="warning.main" variant="caption">Daily reward cap reached</Typography>
                  )}
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: '1 1 160px', bgcolor: 'rgba(255,255,255,0.025)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography color="text.secondary" variant="caption">Damage Dealt</Typography>
                  <Typography fontWeight={950} variant="h5">{resultReward?.damageDealt ?? 0}</Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: '1 1 160px', bgcolor: 'rgba(255,255,255,0.025)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography color="text.secondary" variant="caption">Turns Taken</Typography>
                  <Typography fontWeight={950} variant="h5">{resultReward?.turnsTaken ?? battleState.turnNumber}</Typography>
                </CardContent>
              </Card>
            </Stack>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Best card in battle
              </Typography>
              <Typography fontWeight={950}>
                {resultReward?.bestCard?.name || 'No card recorded'}
              </Typography>
            </Box>
            {resultReward?.bonuses?.length > 0 && (
              <Box>
                <Typography color="text.secondary" variant="body2">Bonuses</Typography>
                {resultReward.bonuses.map((bonus) => (
                  <Typography key={bonus.label} variant="body2">
                    {bonus.label}: +{bonus.amount} Pack Shards
                  </Typography>
                ))}
              </Box>
            )}
            <Typography color="text.secondary" variant="body2">
              Daily rewards: {resultReward?.dailyStatusAfterReward?.rewardsEarned ?? getBattleRewardStatus().rewardsEarned}/{getBattleRewardStatus().limit}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <Button onClick={handleBattleAgain} variant="contained">
                Battle Again
              </Button>
              <Button component={Link} to="/battle" variant="outlined">
                Back to Battle Home
              </Button>
              <Button component={Link} to="/battle/deck-builder" variant="outlined">
                Edit Deck
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <BattleBoard
        activePlayer={battleState.activePlayer}
        animationEvents={animationEvents}
        animationSpeed={animationSpeed}
        enemy={battleState.enemy}
        log={battleState.log}
        onAttackCreature={handleAttackCreature}
        onEndTurn={handleEndTurn}
        onInspectCard={(card) => {
          if (!targetPicker) setInspectedCard(card);
        }}
        onPlayCard={handlePlayCard}
        player={battleState.player}
        showHelpTips={settings.showHelpTips}
        status={battleState.status}
        turnNumber={battleState.turnNumber}
      />

      <TargetPickerDialog
        actionLabel={targetPicker?.actionLabel}
        onClose={() => setTargetPicker(null)}
        onSelectTarget={handleTargetSelected}
        open={Boolean(targetPicker)}
        targets={targetPicker?.targets || []}
      />

      <BattleCardInspectionDialog
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
        open={Boolean(inspectedCard)}
        showOfficialText={settings.showOfficialText}
      />

      <Snackbar autoHideDuration={3600} onClose={() => setSnackbar('')} open={Boolean(snackbar)} message={snackbar} />
    </Box>
  );
}
