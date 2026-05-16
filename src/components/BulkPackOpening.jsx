import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Button, Typography, useMediaQuery } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import SealedPack from './SealedPack.jsx';

export default function BulkPackOpening({
  boosterType,
  onComplete,
  packArt,
  packQuantity = 10,
  setCode,
  setIconUrl,
  setName,
  onSkipToSummary,
}) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const boosterLabel = boosterType === 'collector' ? 'Collector Booster' : 'Play Booster';
  const durationMs = prefersReducedMotion ? 450 : isMobile ? 1900 : 2600;

  useEffect(() => {
    const timer = window.setTimeout(onComplete, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: '#03050d',
        background:
          'radial-gradient(circle at 50% 34%, rgba(244,201,93,0.2), transparent 24rem), radial-gradient(circle at 50% 82%, rgba(76,201,240,0.14), transparent 28rem), #03050d',
        display: 'grid',
        minHeight: '100dvh',
        overflow: 'hidden',
        px: 2,
        py: 4,
        position: 'relative',
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: 1060, position: 'relative', textAlign: 'center', width: '100%', zIndex: 1 }}>
        <Typography color="warning.main" fontWeight={950} gutterBottom>
          {setName || setCode?.toUpperCase()}
        </Typography>
        <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 34, md: 48 }, mb: 1 }}>
          Opening {packQuantity} {boosterLabel}s
        </Typography>
        <Typography color="text.secondary" sx={{ mb: { xs: 3, md: 5 } }}>
          Sealing the pulls into one bulk reveal.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(5, minmax(0, 1fr))', sm: 'repeat(10, minmax(0, 1fr))' },
            gap: { xs: 0.75, sm: 1.25 },
            mx: 'auto',
            maxWidth: 920,
            perspective: 1000,
          }}
        >
          {Array.from({ length: packQuantity }).map((_, index) => (
            <Box
              key={index}
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28, rotate: index % 2 ? 8 : -8 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: [0, 1, 1, 0.72],
                      y: [28, 0, index % 2 ? -8 : -14, 18],
                      rotate: [index % 2 ? 8 : -8, 0, index % 2 ? 5 : -5, 0],
                      scale: [0.9, 1, 1.04, 0.92],
                    }
              }
              transition={{
                delay: prefersReducedMotion ? 0 : index * 0.055,
                duration: prefersReducedMotion ? 0 : isMobile ? 1.55 : 2.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              sx={{
                filter: boosterType === 'collector' ? 'drop-shadow(0 0 16px rgba(244,201,93,0.28))' : 'drop-shadow(0 0 12px rgba(76,201,240,0.18))',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  aspectRatio: '0.62',
                  mx: 'auto',
                  transformOrigin: 'center top',
                  width: { xs: 66, sm: 80, md: 92 },
                }}
              >
                <SealedPack
                  accentArtwork={packArt}
                  boosterLabel={boosterLabel}
                  setCode={setCode}
                  setIconUrl={setIconUrl}
                  setName={setName}
                />
              </Box>
            </Box>
          ))}
        </Box>

        {!prefersReducedMotion && (
          <Box sx={{ inset: 0, pointerEvents: 'none', position: 'absolute' }}>
            {Array.from({ length: isMobile ? 20 : 34 }).map((_, index) => (
              <Box
                key={index}
                component={motion.div}
                animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.2, 0.3], y: [30, -120 - (index % 5) * 18] }}
                transition={{ delay: 1 + index * 0.025, duration: 1.1, ease: 'easeOut' }}
                sx={{
                  bgcolor: index % 3 === 0 ? 'warning.main' : 'secondary.light',
                  borderRadius: '50%',
                  bottom: '18%',
                  boxShadow: '0 0 14px currentColor',
                  height: index % 4 === 0 ? 6 : 4,
                  left: `${8 + ((index * 29) % 84)}%`,
                  position: 'absolute',
                  width: index % 4 === 0 ? 6 : 4,
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 3 }}>
          <Button onClick={onComplete} startIcon={<AutoAwesomeIcon />} variant="outlined">
            Skip to Best Pulls
          </Button>
          <Button onClick={onSkipToSummary} startIcon={<AutoAwesomeIcon />} variant="contained">
            Skip to Summary
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
