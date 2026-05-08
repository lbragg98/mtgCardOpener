import { Box } from '@mui/material';
import { getFoilAnimationConfig } from '../utils/foilAnimations.js';

export default function MobileFoilImpact({ active, card }) {
  if (!active || !card?.isFoil) {
    return null;
  }

  const config = getFoilAnimationConfig(card);

  return (
    <Box
      className={`mobileFoilImpact mobileFoilImpact-${config.treatment} ${config.impactClass}`}
      sx={{
        '--impact-primary': config.colors.primary,
        '--impact-secondary': config.colors.secondary,
        '--impact-accent': config.colors.accent,
      }}
    >
      <Box className="mobileImpactAura" />
      <Box className="mobileImpactRing" />
      <Box className="mobileImpactSparks" />
    </Box>
  );
}
