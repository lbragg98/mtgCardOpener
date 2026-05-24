import { Box } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import BattleCard from './BattleCard.jsx';
import FloatingNumber from './FloatingNumber.jsx';

function getAccent(event) {
  const effectType = event?.effectType || event?.card?.effects?.[0]?.type || event?.card?.type;
  if (['damage', 'damageSpell', 'discard'].includes(effectType)) return '#ff7a4f';
  if (['heal', 'shield'].includes(effectType)) return '#ffe08a';
  if (['buff', 'createToken', 'tokenSpell', 'manaBoost'].includes(effectType)) return '#7dff9b';
  if (['debuff', 'drain', 'removeCreature', 'reanimate', 'bounce'].includes(effectType)) return '#c58cff';
  return '#b98cff';
}

function getNumberType(event) {
  const effectType = event?.effectType;
  if (['heal', 'shield'].includes(effectType)) return 'heal';
  if (['buff', 'createToken', 'manaBoost'].includes(effectType)) return 'buff';
  if (['debuff', 'drain'].includes(effectType)) return 'debuff';
  return 'damage';
}

export default function CardPlayAnimationLayer({ animationEvents = [], animationSpeed = 1 }) {
  return (
    <Box className="battleAnimationLayer">
      <AnimatePresence>
        {animationEvents.map((event) => {
          const accent = getAccent(event);
          const isCreature = event.type === 'playCreature';
          const isAttack = event.type === 'attack';
          const isEnemy = event.sourceZone === 'enemy';
          const cardY = isEnemy ? -90 : 90;

          return (
            <Box key={event.id}>
              {event.card && (
                <Box
                  animate={{
                    opacity: 1,
                    rotateZ: isAttack ? [0, isEnemy ? -6 : 6, isEnemy ? 3 : -3, 0] : isCreature ? [-4, 2, -1, 0] : [0, 2, -1, 0],
                    scale: isCreature ? [0.72, 1.14, 0.96, 1] : isAttack ? [1, 1.08, 1.02, 1] : [0.76, 1.08, 0.98, 1],
                    x: isAttack ? [0, isEnemy ? -56 : 56, isEnemy ? -12 : 12, 0] : 0,
                    y: isCreature ? [cardY, isEnemy ? 12 : -12, isEnemy ? -8 : 8, 0] : [cardY, isEnemy ? 8 : -8, isEnemy ? -2 : 2, 0],
                  }}
                  className="battleAnimatedCard"
                  component={motion.div}
                  exit={{ opacity: 0, scale: 0.86, y: isEnemy ? -40 : 40 }}
                  initial={{ opacity: 0, rotateZ: isEnemy ? 4 : -4, scale: 0.72, y: cardY }}
                  style={{ '--battle-effect-color': accent }}
                  transition={{ duration: (isCreature ? 0.55 : 0.48) * animationSpeed, ease: [0.16, 1, 0.3, 1], times: [0, 0.48, 0.78, 1] }}
                >
                  <BattleCard card={event.card} compact disabled />
                </Box>
              )}
              <Box className="cardLandingImpact" style={{ '--battle-effect-color': accent }} />
              {event.type === 'castSpell' && <Box className="spellResolveBurst" style={{ '--battle-effect-color': accent }} />}
              {event.type === 'attack' && <Box className="attackTrail" style={{ '--battle-effect-color': accent }} />}
              {event.amount && (
                <FloatingNumber
                  amount={event.amount}
                  position={event.targetZone === 'enemy' ? 'enemy' : event.targetZone === 'player' ? 'player' : 'center'}
                  type={getNumberType(event)}
                />
              )}
            </Box>
          );
        })}
      </AnimatePresence>
    </Box>
  );
}
