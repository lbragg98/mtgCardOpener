import { normalizeFoilTreatment } from './foilTypes.js';

const COLLECTION_KEY = 'mtg-pack-opener-collection';
const PACK_SHARDS_KEY = 'mtg-pack-opener-pack-shards';
const DUPLICATE_SHARD_REWARD = 100;
const RECYCLE_SHARD_REWARD = 25;

function createCollectionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRealSaveableCard(card) {
  const typeLine = card?.type_line?.toLowerCase() || '';

  return Boolean(
    card?.id &&
      card?.name &&
      (card?.image || card?.imageUrl) &&
      card?.set &&
      card?.collector_number &&
      !typeLine.includes('token') &&
      !typeLine.includes('art series'),
  );
}

function normalizeCollectionCard(card, openedAt) {
  const isFoil = Boolean(card.isFoil);
  const prices = card.prices || {};

  return {
    collectionId: createCollectionId(),
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    imageUrl: card.imageUrl || card.image,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    prices,
    usd: prices.usd ?? card.usd ?? null,
    usd_foil: prices.usd_foil ?? card.usd_foil ?? null,
    usd_etched: prices.usd_etched ?? card.usd_etched ?? null,
    eur: prices.eur ?? card.eur ?? null,
    eur_foil: prices.eur_foil ?? card.eur_foil ?? null,
    tix: prices.tix ?? card.tix ?? null,
    isFoil,
    foilTreatment: normalizeFoilTreatment({ ...card, isFoil }),
    isCollectorExclusive: Boolean(card.isCollectorExclusive),
    collectorExclusiveReason: card.collectorExclusiveReason || null,
    isSpecialSlot: Boolean(card.isSpecialSlot),
    isOneOfOne: Boolean(card.isOneOfOne),
    specialPullType: card.specialPullType || null,
    openedAt,
  };
}

function normalizeStoredCollectionCard(card) {
  const isFoil = Boolean(card.isFoil);
  const prices = card.prices || {};

  return {
    ...card,
    prices,
    usd: prices.usd ?? card.usd ?? null,
    usd_foil: prices.usd_foil ?? card.usd_foil ?? null,
    usd_etched: prices.usd_etched ?? card.usd_etched ?? null,
    eur: prices.eur ?? card.eur ?? null,
    eur_foil: prices.eur_foil ?? card.eur_foil ?? null,
    tix: prices.tix ?? card.tix ?? null,
    isFoil,
    foilTreatment: normalizeFoilTreatment({ ...card, isFoil }),
    isCollectorExclusive: Boolean(card.isCollectorExclusive),
    collectorExclusiveReason: card.collectorExclusiveReason || null,
    isSpecialSlot: Boolean(card.isSpecialSlot),
    isOneOfOne: Boolean(card.isOneOfOne),
    specialPullType: card.specialPullType || null,
  };
}

function isStoredCollectionCard(card) {
  return Boolean(card?.collectionId && card?.id && card?.name && card?.imageUrl && card?.set);
}

function notifyPackShardsUpdated() {
  window.dispatchEvent(new Event('packShardsUpdated'));
}

function notifyCollectionUpdated() {
  window.dispatchEvent(new Event('collectionUpdated'));
}

export function getCollection() {
  try {
    const savedCollection = localStorage.getItem(COLLECTION_KEY);
    const parsedCollection = savedCollection ? JSON.parse(savedCollection) : [];

    return Array.isArray(parsedCollection)
      ? parsedCollection.filter(isStoredCollectionCard).map(normalizeStoredCollectionCard)
      : [];
  } catch {
    return [];
  }
}

export function getPackShards() {
  try {
    const savedShards = localStorage.getItem(PACK_SHARDS_KEY);
    const parsedShards = Number.parseInt(savedShards || '0', 10);

    return Number.isFinite(parsedShards) && parsedShards > 0 ? parsedShards : 0;
  } catch {
    return 0;
  }
}

export function setPackShards(amount) {
  const nextAmount = Math.max(0, Number.parseInt(amount || 0, 10) || 0);

  localStorage.setItem(PACK_SHARDS_KEY, String(nextAmount));
  notifyPackShardsUpdated();

  return nextAmount;
}

export function addPackShards(amount) {
  return setPackShards(getPackShards() + Math.max(0, Number.parseInt(amount || 0, 10) || 0));
}

export function spendPackShards(amount) {
  const spendAmount = Math.max(0, Number.parseInt(amount || 0, 10) || 0);
  const currentShards = getPackShards();

  if (spendAmount > currentShards) {
    return false;
  }

  setPackShards(currentShards - spendAmount);

  return true;
}

export function calculateDuplicateShardReward(cardsToSave, existingCollection) {
  const duplicateCount = cardsToSave.reduce((count, card) => {
    const isDuplicate = existingCollection.some(
      (existingCard) => existingCard.id === card.id && Boolean(existingCard.isFoil) === Boolean(card.isFoil),
    );

    return isDuplicate ? count + 1 : count;
  }, 0);

  return {
    duplicateCount,
    shardsAwarded: duplicateCount * DUPLICATE_SHARD_REWARD,
  };
}

export function saveCardsToCollection(cards) {
  const currentCollection = getCollection();
  const openedAt = new Date().toISOString();
  const cardsToSave = cards.filter(isRealSaveableCard).map((card) => normalizeCollectionCard(card, openedAt));
  const { duplicateCount, shardsAwarded } = calculateDuplicateShardReward(cardsToSave, currentCollection);
  const nextCollection = [...cardsToSave, ...currentCollection];

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));
  notifyCollectionUpdated();

  const newShardBalance = shardsAwarded > 0 ? addPackShards(shardsAwarded) : getPackShards();

  return {
    savedCards: cardsToSave,
    duplicateCount,
    shardsAwarded,
    newShardBalance,
  };
}

export function clearCollection() {
  localStorage.removeItem(COLLECTION_KEY);
  notifyCollectionUpdated();
}

export function removeCardFromCollection(collectionId) {
  const nextCollection = getCollection().filter((card) => card.collectionId !== collectionId);

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));
  notifyCollectionUpdated();

  return nextCollection;
}

export function recycleCards(collectionIds) {
  const idsToRecycle = new Set(collectionIds);
  const currentCollection = getCollection();
  const recycledCards = currentCollection.filter((card) => idsToRecycle.has(card.collectionId));

  if (!recycledCards.length) {
    throw new Error('No matching collection cards were found to recycle.');
  }

  const updatedCollection = currentCollection.filter((card) => !idsToRecycle.has(card.collectionId));
  const shardsAwarded = recycledCards.length * RECYCLE_SHARD_REWARD;

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(updatedCollection));
  notifyCollectionUpdated();

  const newShardBalance = addPackShards(shardsAwarded);

  return {
    recycledCards,
    shardsAwarded,
    newShardBalance,
    updatedCollection,
  };
}

export function recycleCard(collectionId) {
  const result = recycleCards([collectionId]);

  return {
    recycledCard: result.recycledCards[0],
    shardsAwarded: result.shardsAwarded,
    newShardBalance: result.newShardBalance,
    updatedCollection: result.updatedCollection,
  };
}
