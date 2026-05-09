import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import CardImage from './CardImage.jsx';

const RUNE_MARKS = ['✦', '•', '◇', '✧', 'ᚱ', 'ᛟ', 'ᚾ', '✶', '◦', 'ᛞ', '✹', 'ᚷ'];

export const ONE_OF_ONE_CARD_MOTION = {
  desktop: {
    initial: {
      opacity: 0,
      scale: 0.35,
      rotateY: 140,
      rotateX: -18,
      y: -80,
      filter: 'brightness(0.2) blur(8px)',
    },
    animate: {
      opacity: [0, 0.4, 1, 1],
      scale: [0.35, 0.75, 1.18, 1],
      rotateY: [140, 45, -6, 0],
      rotateX: [-18, 8, -2, 0],
      y: [-80, -20, 10, 0],
      filter: [
        'brightness(0.2) blur(8px)',
        'brightness(0.7) blur(3px)',
        'brightness(1.45) blur(0px)',
        'brightness(1) blur(0px)',
      ],
    },
    transition: {
      duration: 3.2,
      times: [0, 0.45, 0.78, 1],
      ease: [0.16, 1, 0.3, 1],
    },
  },
  mobile: {
    initial: {
      opacity: 0,
      scale: 0.72,
      y: 80,
      rotateZ: -3,
    },
    animate: {
      opacity: 1,
      scale: [0.72, 1.12, 0.96, 1],
      y: [80, -12, 6, 0],
      rotateZ: [-3, 2, 0],
    },
    transition: {
      duration: 3.2,
      times: [0, 0.58, 0.82, 1],
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function OneOfOneRingAtmosphere({ active = true, isMobile = false, settled = false }) {
  const particleCount = isMobile ? 18 : 36;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, index) => ({
        delay: (index % 9) * 0.18,
        left: `${4 + ((index * 37) % 92)}%`,
        size: 2 + (index % 4),
        top: `${7 + ((index * 43) % 86)}%`,
      })),
    [particleCount],
  );

  if (!active) {
    return null;
  }

  return (
    <Box className={['oneRingAtmosphere', settled ? 'oneRingAtmosphereSettled' : ''].filter(Boolean).join(' ')}>
      <Box className="oneRingDarkness" />
      <Box className="oneRingInspectionAura" />
      <Box className="oneRingHalo" />
      <Box className="oneRingRuneCircle">
        {RUNE_MARKS.map((mark, index) => (
          <Box
            key={`${mark}-${index}`}
            component="span"
            sx={{ transform: `rotate(${index * (360 / RUNE_MARKS.length)}deg) translateY(-47%)` }}
          >
            {mark}
          </Box>
        ))}
      </Box>
      <Box className="oneRingRuneCircleOuter">
        {RUNE_MARKS.slice().reverse().map((mark, index) => (
          <Box
            key={`${mark}-outer-${index}`}
            component="span"
            sx={{ transform: `rotate(${index * (360 / RUNE_MARKS.length)}deg) translateY(-48%)` }}
          >
            {mark}
          </Box>
        ))}
      </Box>
      <Box className="oneRingShockwave" />
      <Box className="oneRingGoldDust">
        {particles.map((particle, index) => (
          <Box
            key={index}
            component="span"
            sx={{
              animationDelay: `${particle.delay}s`,
              height: particle.size,
              left: particle.left,
              top: particle.top,
              width: particle.size,
            }}
          />
        ))}
      </Box>
      <Box className="oneRingEmbers" />
    </Box>
  );
}

export default function OneOfOneRingReveal({ active, card, isMobile = false, onComplete }) {
  const [complete, setComplete] = useState(false);
  const motionConfig = isMobile ? ONE_OF_ONE_CARD_MOTION.mobile : ONE_OF_ONE_CARD_MOTION.desktop;
  const imageUrl = card?.imageUrl || card?.image;

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    setComplete(false);
    const completeTimer = window.setTimeout(() => {
      setComplete(true);
      onComplete?.();
    }, 4200);

    return () => window.clearTimeout(completeTimer);
  }, [active, card?.id, onComplete]);

  if (!active || !card) {
    return null;
  }

  return (
    <Box className="oneRingRevealOverlay">
      <OneOfOneRingAtmosphere active isMobile={isMobile} settled={complete} />
      <Box className="oneRingTextFlash">
        <Typography component="div" className="oneRingTextPrimary">
          ONE OF ONE
        </Typography>
        <Typography component="div" className="oneRingTextSecondary">
          THE ONE RING
        </Typography>
      </Box>
      <Box
        className="oneRingRevealCardStage"
        component={motion.div}
        initial={motionConfig.initial}
        animate={motionConfig.animate}
        transition={motionConfig.transition}
      >
        {imageUrl ? (
          <CardImage card={card} className="oneOfOneCardFrame" large variant="reveal" />
        ) : (
          <Box className="oneRingFallbackCard oneOfOneCardFrame">
            <Typography className="oneRingFallbackTitle">The One Ring</Typography>
            <Typography className="oneRingFallbackMark">1 / 1</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
