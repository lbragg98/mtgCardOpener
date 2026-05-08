import { Box } from '@mui/material';
import { getFoilAnimationConfig } from '../utils/foilAnimations.js';

export default function FoilImpactScene({ active = false, card, intensity = 1 }) {
  if (!active || !card?.isFoil) {
    return null;
  }

  const config = getFoilAnimationConfig(card);
  const debris = [
    [-148, -36, 0, 5],
    [-116, 28, 28, 4],
    [-86, -92, 44, 3],
    [-58, 92, 64, 5],
    [-24, -128, 18, 4],
    [18, 118, 58, 3],
    [46, -86, 36, 5],
    [82, 76, 72, 4],
    [116, -48, 24, 5],
    [148, 22, 46, 4],
    [178, -102, 62, 3],
    [-178, 88, 84, 3],
  ];
  const particles = [
    [-196, -78, 20, 3],
    [-142, -150, 54, 2],
    [-72, -186, 76, 2],
    [28, -172, 38, 3],
    [104, -138, 66, 2],
    [186, -74, 30, 3],
    [206, 54, 74, 2],
    [118, 146, 48, 2],
    [-118, 148, 68, 2],
    [-208, 46, 42, 3],
  ];

  return (
    <Box
      className={`foilImpactScene ${config.impactClass} impactIntensity-${intensity}`}
      aria-hidden="true"
      sx={{
        '--impact-primary': config.colors.primary,
        '--impact-secondary': config.colors.secondary,
        '--impact-accent': config.colors.accent,
      }}
    >
      <Box className="impactGroundGlow" />
      <Box className="impactShockwave impactShockwavePrimary" />
      <Box className="impactShockwave impactShockwaveSecondary" />
      <Box className="impactDustRing" />
      <Box className="impactCracks" />
      <Box className="impactEnergyVeins" />
      <Box className="impactDebrisField" />
      {debris.map(([dx, dy, delay, size], index) => (
        <Box
          className="impactDebris"
          key={`debris-${index}`}
          sx={{
            '--delay': `${delay}ms`,
            '--dx': `${dx}px`,
            '--dy': `${dy}px`,
            '--size': `${size}px`,
          }}
        />
      ))}
      {particles.map(([dx, dy, delay, size], index) => (
        <Box
          className="impactMagicParticle"
          key={`particle-${index}`}
          sx={{
            '--delay': `${delay}ms`,
            '--dx': `${dx}px`,
            '--dy': `${dy}px`,
            '--size': `${size}px`,
          }}
        />
      ))}
      <Box className="impactAura" />
    </Box>
  );
}
