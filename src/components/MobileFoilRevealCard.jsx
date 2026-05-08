import { Box, Typography } from '@mui/material';
import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { normalizeFoilTreatment } from '../utils/foilTypes.js';
import CardImage from './CardImage.jsx';
import MobileFoilImpact from './MobileFoilImpact.jsx';

const MOBILE_SWIPE_START_THRESHOLD = 24;
const MOBILE_SWIPE_AWAY_THRESHOLD = 105;
const HORIZONTAL_INTENT_RATIO = 1.45;
const DEFAULT_FOIL_POSITION = {
  x: '50%',
  y: '18%',
  bandX: '50%',
  bandY: '38%',
  brightness: 0.26,
  xNum: 0.5,
  yNum: 0.18,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function MobileFoilRevealCard({ card, cardKey, className = '', onSwipeAway, sx }) {
  const cardRef = useRef(null);
  const touchStartRef = useRef(null);
  const isSwipingRef = useRef(false);
  const swipeX = useMotionValue(0);
  const [canInspect, setCanInspect] = useState(false);
  const [impactActive, setImpactActive] = useState(false);
  const [foilPosition, setFoilPosition] = useState(DEFAULT_FOIL_POSITION);
  const treatment = normalizeFoilTreatment(card);

  function resetMobileFoilState() {
    swipeX.set(0);
    setFoilPosition(DEFAULT_FOIL_POSITION);
    touchStartRef.current = null;
    isSwipingRef.current = false;
  }

  useEffect(() => {
    setCanInspect(false);
    setImpactActive(false);
    resetMobileFoilState();

    const impactTimer = window.setTimeout(() => setImpactActive(true), 250);
    const inspectTimer = window.setTimeout(() => setCanInspect(true), 800);
    const cleanupImpactTimer = window.setTimeout(() => setImpactActive(false), 1500);

    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(inspectTimer);
      window.clearTimeout(cleanupImpactTimer);
    };
  }, [cardKey]);

  function updateMobileFoil(clientX, clientY) {
    if (!canInspect || !cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const clampedX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const clampedY = clamp((clientY - rect.top) / rect.height, 0, 1);
    const dx = clampedX - 0.5;
    const lightY = Math.max(0.03, clampedY * 0.78);
    const brightness = 0.26 + (1 - Math.abs(dx)) * 0.06;

    setFoilPosition({
      x: `${clampedX * 100}%`,
      y: `${lightY * 100}%`,
      bandX: `${(0.5 + dx * 0.48) * 100}%`,
      bandY: `${(0.2 + clampedY * 0.5) * 100}%`,
      brightness,
      xNum: clampedX,
      yNum: lightY,
    });
  }

  function handlePointerDown(event) {
    if (event.pointerType !== 'touch' || !canInspect) {
      return;
    }

    touchStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    };
    isSwipingRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateMobileFoil(event.clientX, event.clientY);
  }

  function handlePointerMove(event) {
    if (event.pointerType !== 'touch' || !touchStartRef.current) {
      return;
    }

    const start = touchStartRef.current;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    start.currentX = event.clientX;
    start.currentY = event.clientY;

    if (
      Math.abs(dx) > MOBILE_SWIPE_START_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * HORIZONTAL_INTENT_RATIO
    ) {
      isSwipingRef.current = true;
    }

    if (isSwipingRef.current) {
      swipeX.set(clamp(dx, -180, 180));
      updateMobileFoil(event.clientX, event.clientY);
      return;
    }

    swipeX.set(0);
    updateMobileFoil(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (event.pointerType !== 'touch') {
      return;
    }

    const start = touchStartRef.current;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (!start) {
      return;
    }

    const dx = (start.currentX ?? event.clientX) - start.startX;

    if (isSwipingRef.current && Math.abs(dx) > MOBILE_SWIPE_AWAY_THRESHOLD) {
      onSwipeAway(dx > 0 ? 1 : -1);
    } else {
      animate(swipeX, 0, { type: 'spring', stiffness: 220, damping: 26 });
    }

    touchStartRef.current = null;
    isSwipingRef.current = false;
  }

  return (
    <Box className={`mobileFoilReveal mobileFoilReveal-${treatment} revealCardOuter`}>
      <Box
        className="mobileFoilSwipeWrapper"
        component={motion.div}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ x: swipeX }}
      >
        <MobileFoilImpact active={impactActive} card={card} />
        <Box
          className="mobileFoilRevealWrapper"
          component={motion.div}
          initial={{
            opacity: 0,
            y: 70,
            scale: 0.84,
            rotateZ: -2,
          }}
          animate={{
            opacity: 1,
            y: [70, -8, 4, 0],
            scale: [0.84, 1.07, 0.98, 1],
            rotateZ: [-2, 1, 0],
          }}
          transition={{
            duration: 0.65,
            times: [0, 0.5, 0.78, 1],
            ease: 'easeOut',
          }}
        >
          <Box
            className="mobileFoilImageWrapper"
            ref={cardRef}
          >
            <CardImage
              card={card}
              className={className}
              foilStyle={{
                '--foil-x': foilPosition.x,
                '--foil-y': foilPosition.y,
                '--foil-band-x': foilPosition.bandX,
                '--foil-band-y': foilPosition.bandY,
                '--foil-brightness': foilPosition.brightness,
                '--foil-strength': foilPosition.brightness,
                '--foil-intensity': foilPosition.brightness,
                '--foil-x-num': foilPosition.xNum,
                '--foil-y-num': foilPosition.yNum,
              }}
              interactiveFoil={canInspect}
              large
              mobileFoilMode
              sx={sx}
              variant="reveal"
            />
          </Box>
        </Box>
      </Box>
      {canInspect && (
        <Typography className="mobileFoilHelper" color="text.secondary">
          Drag to move the foil shine
        </Typography>
      )}
    </Box>
  );
}
