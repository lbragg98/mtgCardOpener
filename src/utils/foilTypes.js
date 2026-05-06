export const FOIL_TREATMENTS = {
  NONE: 'none',
  RAINBOW: 'rainbow',
  ETCHED: 'etched',
  GALAXY: 'galaxy',
  GILDED: 'gilded',
  TEXTURED: 'textured',
};

export const FOIL_LABELS = {
  none: 'Normal',
  rainbow: 'Rainbow Foil',
  etched: 'Etched Foil',
  galaxy: 'Galaxy Foil',
  gilded: 'Gilded Foil',
  textured: 'Textured Foil',
};

const FOIL_ONLY_TREATMENTS = [
  FOIL_TREATMENTS.RAINBOW,
  FOIL_TREATMENTS.ETCHED,
  FOIL_TREATMENTS.GALAXY,
  FOIL_TREATMENTS.GILDED,
  FOIL_TREATMENTS.TEXTURED,
];

export function normalizeFoilTreatment(card) {
  if (!card?.isFoil) {
    return FOIL_TREATMENTS.NONE;
  }

  if (card.foilTreatment === 'standard' || !card.foilTreatment) {
    return FOIL_TREATMENTS.RAINBOW;
  }

  if (card.foilTreatment === 'premium') {
    return FOIL_TREATMENTS.GALAXY;
  }

  return FOIL_ONLY_TREATMENTS.includes(card.foilTreatment) ? card.foilTreatment : FOIL_TREATMENTS.RAINBOW;
}

export function pickRandomFoilTreatment(treatments = FOIL_ONLY_TREATMENTS) {
  return treatments[Math.floor(Math.random() * treatments.length)] || FOIL_TREATMENTS.RAINBOW;
}
