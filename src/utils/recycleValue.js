import { isOneOfOneRing } from './collectorExclusiveCards.js';
import { FOIL_LABELS, FOIL_TREATMENTS, normalizeFoilTreatment } from './foilTypes.js';

const RARITY_SHARDS = {
  common: 10,
  uncommon: 25,
  rare: 75,
  mythic: 150,
};

const FOIL_TREATMENT_SHARDS = {
  [FOIL_TREATMENTS.RAINBOW]: 25,
  [FOIL_TREATMENTS.ETCHED]: 40,
  [FOIL_TREATMENTS.GALAXY]: 50,
  [FOIL_TREATMENTS.GILDED]: 50,
  [FOIL_TREATMENTS.TEXTURED]: 75,
  [FOIL_TREATMENTS.NEON_INK]: 100,
};

function titleCase(value) {
  const text = String(value || '').trim();

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Card';
}

export function getRecycleBreakdown(card) {
  if (!card) {
    return [];
  }

  if (isOneOfOneRing(card)) {
    return [{ label: 'One-of-One protected value', amount: 10000 }];
  }

  const rarity = String(card.rarity || '').toLowerCase();
  const treatment = normalizeFoilTreatment(card);
  const breakdown = [
    {
      label: titleCase(rarity || 'card'),
      amount: RARITY_SHARDS[rarity] || 0,
    },
  ];

  if (card.isFoil) {
    breakdown.push({ label: 'Foil', amount: 25 });
  }

  if (card.isFoil && treatment !== FOIL_TREATMENTS.NONE) {
    const treatmentLabel = FOIL_LABELS[treatment] || titleCase(treatment);
    breakdown.push({
      label: /foil/i.test(treatmentLabel) ? treatmentLabel : `${treatmentLabel} Foil`,
      amount: FOIL_TREATMENT_SHARDS[treatment] || 0,
    });
  }

  if (card.isCollectorExclusive) {
    breakdown.push({ label: 'Collector Booster Exclusive', amount: 100 });
  }

  return breakdown.filter((item) => item.amount > 0);
}

export function getRecycleShardValue(card) {
  return getRecycleBreakdown(card).reduce((total, item) => total + item.amount, 0);
}

export function assertCanRecycleCard(card) {
  if (isOneOfOneRing(card)) {
    throw new Error('One-of-One cards are protected and cannot be recycled by default.');
  }
}
