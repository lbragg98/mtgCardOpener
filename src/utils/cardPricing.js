// Price helpers read Scryfall price fields and choose the best match for foil/nonfoil cards.
import { FOIL_TREATMENTS, normalizeFoilTreatment } from './foilTypes.js';

function parsePrice(value) {
  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function getCardPrice(card) {
  // Etched and foil prices are preferred when the owned copy has that treatment.
  const prices = card?.prices || {};
  const foilTreatment = normalizeFoilTreatment(card);

  if (foilTreatment === FOIL_TREATMENTS.ETCHED) {
    const etchedPrice = parsePrice(prices.usd_etched ?? card?.usd_etched);

    if (etchedPrice) {
      return etchedPrice;
    }
  }

  if (card?.isFoil) {
    const foilPrice = parsePrice(prices.usd_foil ?? card?.usd_foil);

    if (foilPrice) {
      return foilPrice;
    }
  }

  return parsePrice(prices.usd ?? card?.usd);
}

export function formatPrice(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

export function getCollectionValue(collection) {
  return collection.reduce((sum, card) => sum + getCardPrice(card), 0);
}

export function getCardPriceLabel(card) {
  const price = getCardPrice(card);

  if (!price) {
    return 'No price available';
  }

  return formatPrice(price);
}
