import { Box, useMediaQuery } from '@mui/material';
import { animate, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import CardImage from './CardImage.jsx';

const DEFAULT_FOIL_POSITION = {
  x: '50%',
  y: '20%',
  bandX: '50%',
  bandY: '38%',
  brightness: 0.36,
  shadow: 'drop-shadow(0 22px 38px rgba(0, 0, 0, 0.4))',
  xNum: 0.5,
  yNum: 0.2,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function InspectableFoilCard({
  canInspect = false,
  card,
  className = '',
  onSwipeAway,
  swipeAwayThreshold = 120,
  sx,
  variant = 'reveal',
}) {
  const cardRef = useRef(null);
  const isPointerInsideRef = useRef(false);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const swipeX = useMotionValue(0);
  const swipeRotate = useTransform(swipeX, [-260, 260], [-13, 13]);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const smoothRotateX = useSpring(rawRotateX, { stiffness: 120, damping: 22, mass: 0.4 });
  const smoothRotateY = useSpring(rawRotateY, { stiffness: 120, damping: 22, mass: 0.4 });
  const [foilPosition, setFoilPosition] = useState(DEFAULT_FOIL_POSITION);

  useEffect(() => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    swipeX.set(0);
    setFoilPosition(DEFAULT_FOIL_POSITION);
  }, [card?.id, rawRotateX, rawRotateY, swipeX]);

  function resetTilt() {
    rawRotateX.set(0);
    rawRotateY.set(0);
    setFoilPosition(DEFAULT_FOIL_POSITION);
  }

  function updateTilt(clientX, clientY) {
    if (!canInspect || !cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const clampedX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const clampedY = clamp((clientY - rect.top) / rect.height, 0, 1);
    const dx = clampedX - 0.5;
    const dy = clampedY - 0.5;
    const deadZone = 0.04;
    const adjustedX = Math.abs(dx) < deadZone ? 0 : dx;
    const adjustedY = Math.abs(dy) < deadZone ? 0 : dy;
    const maxRotateY = isMobile ? 6 : 8;
    const maxRotateX = isMobile ? 5 : 6;
    const targetRotateY = adjustedX * maxRotateY * 2;
    const targetRotateX = -adjustedY * maxRotateX * 2;
    const lightY = Math.max(0, clampedY * 0.75);
    const topLightBoost = 1 - Math.abs(clampedX - 0.5);
    const brightness = 0.34 + topLightBoost * 0.12;
    const shadowX = adjustedX * -18;
    const shadowY = 22 + Math.abs(adjustedY) * 10;
    const shadowBlur = 36 + brightness * 18;
    const shadowAlpha = 0.34 + brightness * 0.18;

    rawRotateX.set(targetRotateX);
    rawRotateY.set(targetRotateY);
    setFoilPosition({
      x: `${clampedX * 100}%`,
      y: `${lightY * 100}%`,
      bandX: `${(0.5 + adjustedX * 0.5) * 100}%`,
      bandY: `${(0.18 + clampedY * 0.52) * 100}%`,
      brightness,
      shadow: `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`,
      xNum: clampedX,
      yNum: lightY,
    });
  }

  return (
    <Box
      component={motion.div}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.24}
      onDrag={(_, info) => updateTilt(info.point.x, info.point.y)}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > swipeAwayThreshold || Math.abs(info.velocity.x) > 650) {
          onSwipeAway(info.offset.x >= 0 ? 1 : -1);
          return;
        }

        animate(swipeX, 0, { type: 'spring', stiffness: 260, damping: 24 });
        if (!isPointerInsideRef.current) {
          resetTilt();
        }
      }}
      onPointerEnter={() => {
        isPointerInsideRef.current = true;
      }}
      onPointerLeave={() => {
        isPointerInsideRef.current = false;
        resetTilt();
      }}
      onPointerMove={(event) => updateTilt(event.clientX, event.clientY)}
      onPointerUp={() => {
        if (!isPointerInsideRef.current) {
          resetTilt();
        }
      }}
      ref={cardRef}
      style={{
        x: swipeX,
        rotate: swipeRotate,
        filter: foilPosition.shadow,
        transformStyle: 'preserve-3d',
      }}
      sx={{
        cursor: canInspect ? 'grab' : 'default',
        perspective: '1000px',
        touchAction: 'none',
        willChange: 'transform',
      }}
    >
      <Box
        component={motion.div}
        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: 'preserve-3d',
        }}
        sx={{
          backfaceVisibility: 'hidden',
          transformOrigin: 'center',
          willChange: 'transform',
        }}
      >
        <CardImage
          card={card}
          className={className}
          interactiveFoil={canInspect}
          large
          sx={sx}
          variant={variant}
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
        />
      </Box>
    </Box>
  );
}
