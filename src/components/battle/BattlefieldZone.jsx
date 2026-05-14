import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import BattleCard from './BattleCard.jsx';

export default function BattlefieldZone({
  animationSpeed = 1,
  cards = [],
  getCardDisabled,
  onCardClick,
  onInspectCard,
  owner = 'player',
  selectedCardId,
  title,
  validTargets = [],
  zoneType = 'playerBattlefield',
}) {
  const isHand = zoneType === 'playerHand';
  const isEnemy = owner === 'enemy';

  return (
    <Box className={`battlefieldZone ${zoneType}`} sx={{ minWidth: 0 }}>
      <Typography className="battlefieldZoneTitle" variant="overline">
        {title}
      </Typography>
      {!cards.length ? (
        <Box className="battlefieldEmptyState">
          {isHand ? 'No cards in hand' : 'No creatures in play'}
        </Box>
      ) : (
        <Box className={isHand ? 'battleHandFan' : 'battleCreatureRow'}>
          <AnimatePresence initial={false}>
            {cards.map((card, index) => {
              const cardId = card.instanceId || card.userCardId || card.collectionId || card.battleId;
              const disabled = getCardDisabled ? getCardDisabled(card) : false;
              const isValidTarget = validTargets.includes(cardId);
              const fanOffset = index - (cards.length - 1) / 2;

              return (
                <Box
                  animate={{
                    opacity: 1,
                    rotateZ: isHand ? fanOffset * 2.4 : card.hasAttacked ? -5 : 0,
                    scale: 1,
                    x: 0,
                    y: isHand ? Math.abs(fanOffset) * 4 : 0,
                  }}
                  className={isHand ? 'battleHandCardSlot' : 'battlefieldCardSlot'}
                  component={motion.div}
                  exit={{ opacity: 0, scale: 0.82, y: isEnemy ? -20 : 20 }}
                  initial={{ opacity: 0, rotateZ: isHand ? fanOffset * 3 : 0, scale: 0.9, y: isEnemy ? -26 : 26 }}
                  key={`${cardId}-${index}`}
                  layout
                  transition={{ duration: 0.24 * animationSpeed, ease: 'easeOut' }}
                  whileHover={disabled ? undefined : { scale: isHand ? 1.06 : 1.03, y: isHand ? -18 : -4, zIndex: 8 }}
                >
                  <BattleCard
                    card={card}
                    compact
                    disabled={disabled}
                    exhausted={Boolean(card.hasAttacked || (!card.canAttack && !card.summonedThisTurn && zoneType !== 'playerHand'))}
                    onClick={onCardClick ? () => onCardClick(card) : undefined}
                    onInspect={onInspectCard}
                    playable={isHand && !disabled}
                    ready={Boolean(card.canAttack && !card.hasAttacked)}
                    selected={selectedCardId === cardId}
                    selectable={Boolean(onCardClick)}
                    validTarget={isValidTarget}
                  />
                </Box>
              );
            })}
          </AnimatePresence>
        </Box>
      )}
    </Box>
  );
}
