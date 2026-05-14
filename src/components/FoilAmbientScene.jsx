// Ambient foil glow sits behind inspected/revealed cards without changing card data.
import { Box } from '@mui/material';
import { FOIL_TREATMENTS } from '../utils/foilTypes.js';
import { getFoilAnimationConfig } from '../utils/foilAnimations.js';

export default function FoilAmbientScene({ active = false, card, isMobile = false, variant = 'reveal' }) {
  if (!active || !card?.isFoil) {
    return null;
  }

  const config = getFoilAnimationConfig(card);
  const isGalaxy = config.treatment === FOIL_TREATMENTS.GALAXY;

  return (
    <Box
      aria-hidden="true"
      className={[
        'foilAmbientScene',
        config.ambientClass,
        isMobile ? 'foilAmbientScene-mobile' : '',
        variant === 'detail' ? 'foilAmbientScene-detail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        '--ambient-primary': config.colors.primary,
        '--ambient-secondary': config.colors.secondary,
        '--ambient-accent': config.colors.accent,
      }}
    >
      <Box className="ambientCore" />
      <Box className="ambientRays rainbowRays" />
      <Box className="ambientParticles rainbowParticles" />
      <Box className="etchedMetalAura" />
      <Box className="etchedGlintLines" />
      <Box className="galaxyNebula" />
      <Box className="galaxyStars" />
      {isGalaxy && (
        <>
          <Box className="galaxyShootingStar" />
          <Box className="galaxyShootingStar delay1" />
          <Box className="galaxyShootingStar delay2" />
        </>
      )}
      <Box className="galaxyDust" />
      <Box className="gildedAura" />
      <Box className="gildedSparks" />
      <Box className="gildedDust" />
      <Box className="texturedPremiumAura" />
      <Box className="texturedRipple" />
      <Box className="texturedPatternPulse" />
      <Box className="neonInkPulse" />
      <Box className="neonInkLines" />
      <Box className="neonInkArcs" />
    </Box>
  );
}
