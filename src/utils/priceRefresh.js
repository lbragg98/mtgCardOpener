import { getCardById, getCardsByIds } from '../api/scryfall.js';

const COLLECTION_KEY = 'mtg-pack-opener-collection';
const BATCH_SIZE = 75;
const BATCH_DELAY_MS = 100;

function delay(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function chunk(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function mergePriceData(collectionCard, refreshedCard) {
  const prices = refreshedCard?.prices || {};

  return {
    ...collectionCard,
    prices,
    usd: prices.usd ?? refreshedCard?.usd ?? collectionCard.usd ?? null,
    usd_foil: prices.usd_foil ?? refreshedCard?.usd_foil ?? collectionCard.usd_foil ?? null,
    usd_etched: prices.usd_etched ?? refreshedCard?.usd_etched ?? collectionCard.usd_etched ?? null,
    eur: prices.eur ?? refreshedCard?.eur ?? collectionCard.eur ?? null,
    eur_foil: prices.eur_foil ?? refreshedCard?.eur_foil ?? collectionCard.eur_foil ?? null,
    tix: prices.tix ?? refreshedCard?.tix ?? collectionCard.tix ?? null,
  };
}

async function refreshBatch(cardIds) {
  try {
    return await getCardsByIds(cardIds);
  } catch {
    const refreshedCards = [];

    for (const cardId of cardIds) {
      try {
        refreshedCards.push(await getCardById(cardId));
      } catch {
        // Keep refreshing the rest of the batch even if one card fails.
      }

      await delay(BATCH_DELAY_MS);
    }

    return refreshedCards;
  }
}

export async function refreshCollectionPrices(collection) {
  const refreshableIds = [...new Set(collection.map((card) => card.id).filter(Boolean))];
  const refreshedById = new Map();
  const cardIdBatches = chunk(refreshableIds, BATCH_SIZE);

  for (let index = 0; index < cardIdBatches.length; index += 1) {
    const cardIdBatch = cardIdBatches[index];
    const refreshedCards = await refreshBatch(cardIdBatch);

    refreshedCards.forEach((card) => {
      refreshedById.set(card.id, card);
    });

    if (index < cardIdBatches.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  let updatedCount = 0;
  const updatedCollection = collection.map((card) => {
    const refreshedCard = refreshedById.get(card.id);

    if (!refreshedCard) {
      return card;
    }

    updatedCount += 1;

    return mergePriceData(card, refreshedCard);
  });

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(updatedCollection));
  window.dispatchEvent(new Event('collectionUpdated'));

  return {
    updatedCollection,
    updatedCount,
    failedCount: Math.max(0, collection.filter((card) => card.id).length - updatedCount),
  };
}
