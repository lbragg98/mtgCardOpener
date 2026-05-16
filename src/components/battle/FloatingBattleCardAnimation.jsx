import { Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import BattleCard from './BattleCard.jsx';

function fallbackRect(isMobile) {
  const width = isMobile ? 126 : 150;
  return {
    height: width * 1.4,
    left: window.innerWidth / 2 - width / 2,
    top: window.innerHeight - width * 1.7,
    width,
  };
}

export default function FloatingBattleCardAnimation({
  actionType = 'playCreature',
  card,
  fromRect,
  onComplete,
  toRect,
}) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const startRect = fromRect || fallbackRect(isMobile);
  const endRect = toRect || {
    height: (isMobile ? 104 : 125) * 1.4,
    left: window.innerWidth / 2 - (isMobile ? 52 : 62.5),
    top: actionType === 'castSpell' ? window.innerHeight * 0.42 : window.innerHeight * 0.55,
    width: isMobile ? 104 : 125,
  };
  const duration = isMobile ? 0.32 : 0.42;
  const effectStyle = {
    left: endRect.left + endRect.width / 2,
    top: endRect.top + (endRect.height || endRect.width * 1.4) / 2,
  };

  function handleAnimationComplete() {
    if (actionType !== 'castSpell') {
      onComplete?.();
      return;
    }

    window.setTimeout(() => onComplete?.(), 120);
  }

  return (
    <Box className="floatingBattleCardLayer">
      <Box
        animate={{
          height: endRect.height || endRect.width * 1.4,
          left: endRect.left,
          opacity: actionType === 'castSpell' ? [1, 1, 0.92] : 1,
          top: endRect.top,
          width: endRect.width,
          scale: [1, 1.08, 1],
        }}
        className="floatingBattleCard"
        component={motion.div}
        initial={{
          height: startRect.height || startRect.width * 1.4,
          left: startRect.left,
          opacity: 1,
          top: startRect.top,
          width: startRect.width,
          scale: 1,
        }}
        onAnimationComplete={handleAnimationComplete}
        transition={{ duration, ease: [0.16, 1, 0.3, 1], times: [0, 0.72, 1] }}
      >
        <BattleCard card={card} size={actionType === 'castSpell' ? 'preview' : 'field'} />
      </Box>
      {actionType === 'castSpell' && <Box className="floatingSpellBurst" sx={{ ...effectStyle, animationDelay: `${duration * 0.72}s` }} />}
      {actionType === 'playCreature' && <Box className="floatingCreatureImpact" sx={effectStyle} />}
    </Box>
  );
}
