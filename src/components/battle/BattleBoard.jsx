import { Box, Button, Card, CardContent, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import BattleArenaBackground from './BattleArenaBackground.jsx';
import BattleHand from './BattleHand.jsx';
import BattleLog from './BattleLog.jsx';
import BattlefieldZone from './BattlefieldZone.jsx';
import CardPlayAnimationLayer from './CardPlayAnimationLayer.jsx';
import FloatingNumber from './FloatingNumber.jsx';
import PlayerStatsPanel from './PlayerStatsPanel.jsx';

export default function BattleBoard({
  activePlayer,
  animationEvents = [],
  animationSpeed = 1,
  enemy,
  enemyBadge = '',
  enemyName = 'Enemy Binder',
  log,
  onAttackCreature,
  onEndTurn,
  onInspectCard,
  onPlayCard,
  player,
  playerName = 'You',
  status,
  showHelpTips = true,
  turnNumber,
}) {
  const [logOpen, setLogOpen] = useState(false);
  const isPlayerTurn = activePlayer === 'player' && status === 'playing';
  const latestPopup = ['damage', 'heal', 'spell', 'destroy'].includes(log?.[0]?.type) ? log[0] : null;
  const resultType = status === 'won' ? 'Victory' : status === 'lost' ? 'Defeat' : null;
  const phaseLabel = resultType || (isPlayerTurn ? 'Your Turn' : 'Enemy Turn');

  return (
    <Box className="battleArenaShell">
      <BattleArenaBackground phase={activePlayer} playerDominance={(player.health || 0) - (enemy.health || 0)} />

      <Box className="battleArenaContent">
        <Box className="battleCommandZone enemyZone">
          <PlayerStatsPanel
            battlefield={enemy.battlefield}
            deckCount={enemy.deck.length}
            graveyardCount={enemy.graveyard.length}
            handCount={enemy.hand.length}
            health={enemy.health}
            mana={enemy.mana}
            maxMana={enemy.maxMana}
            name={enemyName}
            owner="enemy"
            badge={enemyBadge}
          />
        </Box>

        <BattlefieldZone
          animationSpeed={animationSpeed}
          cards={enemy.battlefield}
          onInspectCard={onInspectCard}
          owner="enemy"
          title="Enemy Battlefield"
          zoneType="enemyBattlefield"
        />

        <Card className="battleCenterLane">
          <CardContent sx={{ p: { xs: 1.25, sm: 1.8 }, '&:last-child': { pb: { xs: 1.25, sm: 1.8 } } }}>
            <AnimatePresence mode="wait">
              <Box
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="turnBanner"
                component={motion.div}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                key={`${activePlayer}-${turnNumber}-${status}`}
                transition={{ duration: 0.24 * animationSpeed, ease: 'easeOut' }}
              >
                <Box>
                  <Typography variant="h5">{phaseLabel}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Turn {turnNumber} - {status === 'playing' ? 'Choose plays, attack, then end your turn.' : 'Battle complete'}
                  </Typography>
                  {showHelpTips && status === 'playing' && (
                    <Typography color="text.secondary" variant="caption">
                      Click a card to play it. Click ready creatures to attack. Select targets when prompted.
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip color={isPlayerTurn ? 'success' : 'warning'} label={isPlayerTurn ? 'Active' : 'Enemy acting'} />
                  <Button className="battleEndTurnButton" disabled={!isPlayerTurn} onClick={onEndTurn} variant="contained">
                    End Turn
                  </Button>
                  <IconButton aria-label="Toggle battle log" onClick={() => setLogOpen((value) => !value)}>
                    <MenuOpenIcon />
                  </IconButton>
                </Stack>
              </Box>
            </AnimatePresence>
            <Collapse in={logOpen}>
              <Box sx={{ mt: 1.5 }}>
                <BattleLog animationSpeed={animationSpeed} entries={log} />
              </Box>
            </Collapse>
          </CardContent>
          <AnimatePresence>
            {latestPopup && (
              <FloatingNumber
                key={latestPopup.id}
                amount={latestPopup.message.match(/\d+/)?.[0] || 1}
                position="center"
                type={latestPopup.type === 'heal' ? 'heal' : latestPopup.type === 'spell' ? 'buff' : 'damage'}
              />
            )}
          </AnimatePresence>
        </Card>

        <BattlefieldZone
          animationSpeed={animationSpeed}
          cards={player.battlefield}
          getCardDisabled={(card) => !isPlayerTurn || !card.canAttack || card.hasAttacked}
          onCardClick={onAttackCreature}
          onInspectCard={onInspectCard}
          owner="player"
          title="Your Battlefield"
          zoneType="playerBattlefield"
        />

        <Box className="battleBottomGrid">
          <PlayerStatsPanel
            battlefield={player.battlefield}
            deckCount={player.deck.length}
            graveyardCount={player.graveyard.length}
            handCount={player.hand.length}
            health={player.health}
            mana={player.mana}
            maxMana={player.maxMana}
            name={playerName}
            owner="player"
          />
          <BattleHand animationSpeed={animationSpeed} cards={player.hand} disabled={!isPlayerTurn} mana={player.mana} onInspectCard={onInspectCard} onPlayCard={onPlayCard} />
        </Box>
      </Box>
      <CardPlayAnimationLayer animationEvents={animationEvents} animationSpeed={animationSpeed} />
    </Box>
  );
}
