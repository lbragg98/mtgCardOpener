import { Box } from '@mui/material';

export default function BattleArenaBackground({ phase = 'playing', playerDominance = 0 }) {
  return (
    <Box
      aria-hidden
      className={`battleArenaBackground phase-${phase}`}
      sx={{
        '--dominance-shift': `${playerDominance}px`,
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 0,
      }}
    >
      <Box className="battleArenaParticles" />
      <Box className="battleArenaLane" />
    </Box>
  );
}
