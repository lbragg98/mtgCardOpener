import { Box, Chip, Typography } from '@mui/material';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import { FOIL_LABELS, FOIL_TREATMENTS, normalizeFoilTreatment } from '../utils/foilTypes.js';

const FOIL_CLASS_BY_TREATMENT = {
  [FOIL_TREATMENTS.RAINBOW]: 'foilRainbow',
  [FOIL_TREATMENTS.ETCHED]: 'foilEtched',
  [FOIL_TREATMENTS.GALAXY]: 'foilGalaxy',
  [FOIL_TREATMENTS.GILDED]: 'foilGilded',
  [FOIL_TREATMENTS.TEXTURED]: 'foilTextured',
  [FOIL_TREATMENTS.NEON_INK]: 'foilNeonInk',
};

export function getFoilIntensity(card) {
  if (!card?.isFoil) {
    return 0;
  }

  const treatment = normalizeFoilTreatment(card);

  if (treatment === FOIL_TREATMENTS.TEXTURED || treatment === FOIL_TREATMENTS.NEON_INK) {
    return 4;
  }

  if (treatment === FOIL_TREATMENTS.GALAXY || treatment === FOIL_TREATMENTS.GILDED) {
    return 3;
  }

  if (treatment === FOIL_TREATMENTS.ETCHED) {
    return 2;
  }

  return 1;
}

function getFoilClass(card) {
  if (!card?.isFoil) {
    return '';
  }

  const treatment = normalizeFoilTreatment(card);
  return [FOIL_CLASS_BY_TREATMENT[treatment], `foil-${treatment}`].filter(Boolean).join(' ');
}

function getFoilLabel(card) {
  if (!card?.isFoil) {
    return '';
  }

  return FOIL_LABELS[normalizeFoilTreatment(card)] || FOIL_LABELS[FOIL_TREATMENTS.RAINBOW];
}

export default function CardImage({
  card,
  className = '',
  foilStyle,
  interactiveFoil = false,
  large = false,
  mobileFoilMode = false,
  onClick,
  sx,
  variant = 'grid',
}) {
  const imageUrl = card?.imageUrl || card?.image;
  const variantClass = `variant${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;
  const foilClass = getFoilClass(card);
  const foilLabel = getFoilLabel(card);
  const foilIntensity = getFoilIntensity(card);
  const rarityClass = ['rare', 'mythic'].includes(card?.rarity) ? `foilRarity-${card.rarity}` : '';
  const isOneOfOne = isOneOfOneRing(card);

  return (
    <Box
      className={[
        'cardImageWrapper',
        isOneOfOne ? 'oneOfOneCardFrame' : '',
        card?.isCollectorExclusive ? 'collectorExclusiveCard' : '',
        card?.isFoil ? 'foilCard' : '',
        card?.isFoil ? `foilVariant-${variant}` : '',
        card?.isFoil ? variantClass : '',
        card?.isFoil && interactiveFoil ? 'interactiveFoil' : '',
        card?.isFoil ? `foilIntensity-${foilIntensity}` : '',
        card?.isFoil && mobileFoilMode ? 'mobileFoilInspect mobileFoilMode' : '',
        rarityClass,
        foilClass,
        large ? 'cardImageLarge' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      sx={{ ...foilStyle, ...sx }}
    >
      {card?.isFoil && <Box className="foilAura" />}
      {card?.isCollectorExclusive && (
        <Chip
          className="collectorExclusiveLabel"
          color="warning"
          label={isOneOfOne ? '1 of 1' : 'Collector Booster Exclusive'}
          size="small"
          variant="filled"
        />
      )}
      {imageUrl ? (
        <Box
          alt={card?.name || 'Magic card'}
          className="cardImage"
          component="img"
          draggable={false}
          src={imageUrl}
        />
      ) : (
        <Box
          className="cardImage"
          sx={{
            alignItems: 'center',
            bgcolor: '#080a12',
            border: '1px solid rgba(244, 201, 93, 0.38)',
            color: 'warning.main',
            display: 'flex',
            justifyContent: 'center',
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography fontWeight={900}>{card?.name || 'The One Ring'}</Typography>
        </Box>
      )}

      {card?.isFoil && (
        <>
        <Box className="foilRevealBurst" />
          <Box className="foilColorLayer" />
          <Box className="foilOverlay" />
          <Box className="realisticFoilLayer" />
          <Box className="foilSpecularHotspot" />
          <Box className="foilReflectiveBand" />
          <Box className="foilSweep" />
          <Box className="foilSparkles" />
          <Box className="foilTreatmentTexture" />
          <Box className="foilTexturePattern" />
          <Box className="foilBorderGlow" />
          {foilLabel && (
            <Chip
              className={[
                'foilLabel',
                normalizeFoilTreatment(card) === FOIL_TREATMENTS.NEON_INK ? 'foilLabelNeonInk' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              color={
                [FOIL_TREATMENTS.ETCHED, FOIL_TREATMENTS.NEON_INK].includes(normalizeFoilTreatment(card))
                  ? 'default'
                  : 'warning'
              }
              label={foilLabel}
              size="small"
              variant="filled"
            />
          )}
        </>
      )}
    </Box>
  );
}
