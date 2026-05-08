import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import BinderCover from './BinderCover.jsx';

export function getBinderOpenConfig(binder) {
  if (!binder || binder.capacity <= 10) {
    return { duration: 0.9, intensity: 1, particleCount: 6 };
  }

  if (binder.capacity <= 35) {
    return { duration: 1.05, intensity: 2, particleCount: 10 };
  }

  if (binder.capacity <= 65) {
    return { duration: 1.2, intensity: 3, particleCount: 14 };
  }

  return { duration: 1.35, intensity: 4, particleCount: 18 };
}

export default function BinderOpenAnimation({ binder, onComplete }) {
  const config = getBinderOpenConfig(binder);
  const particles = useMemo(
    () =>
      Array.from({ length: config.particleCount }, (_, index) => ({
        delay: 0.18 + index * 0.035,
        dx: Math.cos(index * 1.7) * (70 + index * 6),
        dy: Math.sin(index * 1.35) * (36 + index * 3) - 28,
        size: 2 + (index % 3),
      })),
    [config.particleCount],
  );

  return (
    <Box className={`binderOpenStage binderOpenIntensity-${config.intensity}`}>
      <Box className="binderOpenGlow" sx={{ '--binder-accent': binder.colors.accent, '--binder-primary': binder.colors.primary }} />
      <motion.div
        className="binderOpenBook"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <Box className="binderOpenBackPage" sx={{ '--binder-accent': binder.colors.accent, '--binder-secondary': binder.colors.secondary }} />
        {[0, 1, 2, 3].map((pageIndex) => (
          <Box
            className="binderOpenPage"
            key={pageIndex}
            sx={{
              '--page-delay': `${0.22 + pageIndex * 0.08}s`,
              '--page-rotate': `${-16 - pageIndex * 7}deg`,
              '--binder-accent': binder.colors.accent,
            }}
          />
        ))}
        <motion.div
          className="binderOpenCover"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: -118 }}
          transition={{ duration: config.duration, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
          onAnimationComplete={onComplete}
        >
          <BinderCover animated={false} binder={binder} owned size="large" />
        </motion.div>
      </motion.div>
      <Box className="binderOpenRunePulse" sx={{ '--binder-accent': binder.colors.accent }} />
      {particles.map((particle, index) => (
        <Box
          className="binderOpenParticle"
          key={index}
          sx={{
            '--binder-accent': binder.colors.accent,
            '--dx': `${particle.dx}px`,
            '--dy': `${particle.dy}px`,
            '--delay': `${particle.delay}s`,
            '--size': `${particle.size}px`,
          }}
        />
      ))}
    </Box>
  );
}
