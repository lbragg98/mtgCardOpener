import { Box, Chip } from '@mui/material';
import { FOIL_LABELS, FOIL_TREATMENTS, normalizeFoilTreatment } from '../utils/foilTypes.js';

const FOIL_CLASS_BY_TREATMENT = {
  [FOIL_TREATMENTS.RAINBOW]: 'foilRainbow',
  [FOIL_TREATMENTS.ETCHED]: 'foilEtched',
  [FOIL_TREATMENTS.GALAXY]: 'foilGalaxy',
  [FOIL_TREATMENTS.GILDED]: 'foilGilded',
  [FOIL_TREATMENTS.TEXTURED]: 'foilTextured',
};

export function getFoilIntensity(card) {
  if (!card?.isFoil) {
    return 0;
  }

  const treatment = normalizeFoilTreatment(card);

  if (treatment === FOIL_TREATMENTS.TEXTURED) {
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

export default function CardImage({ card, className = '', large = false, onClick, sx, variant = 'grid' }) {
  const imageUrl = card?.imageUrl || card?.image;
  const foilClass = getFoilClass(card);
  const foilLabel = getFoilLabel(card);
  const foilIntensity = getFoilIntensity(card);
  const rarityClass = ['rare', 'mythic'].includes(card?.rarity) ? `foilRarity-${card.rarity}` : '';

  return (
    <Box
      className={[
        'cardImageWrapper',
        card?.isFoil ? 'foilCard' : '',
        card?.isFoil ? `foilVariant-${variant}` : '',
        card?.isFoil ? `foilIntensity-${foilIntensity}` : '',
        rarityClass,
        foilClass,
        large ? 'cardImageLarge' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      sx={sx}
    >
      {card?.isFoil && <Box className="foilAura" />}
      <Box
        alt={card?.name || 'Magic card'}
        className="cardImage"
        component="img"
        draggable={false}
        src={imageUrl}
      />

      {card?.isFoil && (
        <>
          <Box className="foilRevealBurst" />
          <Box className="foilOverlay" />
          <Box className="foilSweep" />
          <Box className="foilSparkles" />
          <Box className="foilTexturePattern" />
          <Box className="foilBorderGlow" />
          {foilLabel && (
            <Chip
              className="foilLabel"
              color={normalizeFoilTreatment(card) === FOIL_TREATMENTS.ETCHED ? 'default' : 'warning'}
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
