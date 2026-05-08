import { Box } from '@mui/material';
import { normalizeFoilTreatment } from '../utils/foilTypes.js';

export default function MobileFoilImpact({ active, card }) {
  if (!active || !card?.isFoil) {
    return null;
  }

  const treatment = normalizeFoilTreatment(card);

  return (
    <Box className={`mobileFoilImpact mobileFoilImpact-${treatment}`}>
      <Box className="mobileImpactAura" />
      <Box className="mobileImpactRing" />
      <Box className="mobileImpactDust" />
      <Box className="mobileImpactSparks" />
    </Box>
  );
}
