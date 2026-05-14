// Stone battlefield background and atmosphere stay behind cards without blocking pointer events.
import { Box } from '@mui/material';

export default function BattleArenaBackground({ phase = 'playing', playerDominance = 0 }) {
  return (
    <Box
      aria-hidden
      className={`battleArenaBackground battlefieldStoneRunes phase-${phase}`}
      sx={{
        '--dominance-shift': `${playerDominance}px`,
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 0,
      }}
    >
      <Box className="battlefieldImageLayer" />
      <Box className="battlefieldBlueGlowLayer" />
      <Box className="battlefieldMagicParticles" />
      <Box className="battlefieldMistLayer" />
      <Box className="battlefieldReadabilityVignette" />
    </Box>
  );
}
