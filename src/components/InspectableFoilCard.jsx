import { Box } from '@mui/material';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import CardImage from './CardImage.jsx';

const DEFAULT_FOIL_POSITION = {
  x: '50%',
  y: '20%',
  bandX: '50%',
  bandY: '38%',
  intensity: 0.28,
  shadow: 'drop-shadow(0 24px 42px rgba(0, 0, 0, 0.42))',
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
  const dragX = useMotionValue(0);
  const swipeRotate = useTransform(dragX, [-260, 260], [-13, 13]);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const [foilPosition, setFoilPosition] = useState(DEFAULT_FOIL_POSITION);

  useEffect(() => {
    rotateX.set(0);
    rotateY.set(0);
    dragX.set(0);
    setFoilPosition(DEFAULT_FOIL_POSITION);
  }, [card?.id, dragX, rotateX, rotateY]);

  function resetTilt() {
    animate(rotateX, 0, { type: 'spring', stiffness: 180, damping: 20 });
    animate(rotateY, 0, { type: 'spring', stiffness: 180, damping: 20 });
    setFoilPosition(DEFAULT_FOIL_POSITION);
  }

  function updateTilt(clientX, clientY) {
    if (!canInspect || !cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    const nextRotateY = clamp((x - 0.5) * 36, -18, 18);
    const nextRotateX = clamp((0.5 - y) * 28, -14, 14);
    const lightBoost = Math.max(0, 1 - Math.abs(x - 0.5) * 1.15) * Math.max(0, 1 - y * 0.86);
    const shadowX = (x - 0.5) * -30;
    const shadowY = 24 + y * 14;
    const shadowBlur = 38 + lightBoost * 18;
    const shadowAlpha = 0.36 + lightBoost * 0.18;

    rotateX.set(nextRotateX);
    rotateY.set(nextRotateY);
    setFoilPosition({
      x: `${x * 100}%`,
      y: `${y * 100}%`,
      bandX: `${(0.5 + (x - 0.5) * 0.45) * 100}%`,
      bandY: `${(0.2 + y * 0.58) * 100}%`,
      intensity: 0.22 + lightBoost * 0.56,
      shadow: `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`,
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

        animate(dragX, 0, { type: 'spring', stiffness: 260, damping: 24 });
        resetTilt();
      }}
      onPointerLeave={resetTilt}
      onPointerMove={(event) => updateTilt(event.clientX, event.clientY)}
      ref={cardRef}
      style={{
        x: dragX,
        rotate: swipeRotate,
        rotateX,
        rotateY,
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
          '--foil-intensity': foilPosition.intensity,
        }}
      />
    </Box>
  );
}
