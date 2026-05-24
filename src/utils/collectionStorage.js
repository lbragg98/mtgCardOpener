import { normalizeFoilTreatment } from "./foilTypes.js";
import { assertCanRecycleCard, getRecycleShardValue } from "./recycleValue.js";

const COLLECTION_KEY = "mtg-pack-opener-collection";
const PACK_SHARDS_KEY = "mtg-pack-opener-pack-shards";
const DUPLICATE_SHARD_REWARD = 100;

function createCollectionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRealSaveableCard(card) {
  const typeLine = card?.type_line?.toLowerCase() || "";

  return Boolean(
    card?.id &&
    card?.name &&
    (card?.image || card?.imageUrl) &&
    card?.set &&
    card?.collector_number &&
    !typeLine.includes("token") &&
    !typeLine.includes("art series"),
  );
}

function normalizeCollectionCard(card, openedAt) {
  const isFoil = Boolean(card.isFoil);
  const prices = card.prices || {};
  const fullScryfallData = card.full_scryfall_data || card.raw || card;

  return {
    collectionId: createCollectionId(),
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    imageUrl: card.imageUrl || card.image,
    image_uris: fullScryfallData.image_uris || null,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    type_line: card.type_line || card.typeLine || fullScryfallData.type_line || "",
    oracle_text: card.oracle_text || card.oracleText || fullScryfallData.oracle_text || "",
    mana_cost: card.mana_cost || card.manaCost || fullScryfallData.mana_cost || "",
    cmc: Number(card.cmc ?? card.mana_value ?? fullScryfallData.cmc ?? 0),
    mana_value: Number(card.mana_value ?? card.cmc ?? fullScryfallData.mana_value ?? 0),
    power: card.power || fullScryfallData.power || null,
    toughness: card.toughness || fullScryfallData.toughness || null,
    colors: card.colors || fullScryfallData.colors || [],
    color_identity: card.color_identity || card.colorIdentity || fullScryfallData.color_identity || [],
    keywords: card.keywords || fullScryfallData.keywords || [],
    card_faces: card.card_faces || card.cardFaces || fullScryfallData.card_faces || [],
    legalities: card.legalities || fullScryfallData.legalities || {},
    layout: card.layout || fullScryfallData.layout || null,
    full_scryfall_data: fullScryfallData,
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
    packNumber: card.packNumber || null,
    sourcePackId: card.sourcePackId || null,
    boosterType: card.boosterType || null,
    bulkCardIndex: card.bulkCardIndex || null,
    openedAt,
  };
}

function normalizeStoredCollectionCard(card) {
  const isFoil = Boolean(card.isFoil);
  const prices = card.prices || {};

  return {
    ...card,
    prices,
    type_line: card.type_line || card.full_scryfall_data?.type_line || "",
    oracle_text: card.oracle_text || card.full_scryfall_data?.oracle_text || "",
    mana_cost: card.mana_cost || card.full_scryfall_data?.mana_cost || "",
    cmc: Number(card.cmc ?? card.full_scryfall_data?.cmc ?? 0),
    mana_value: Number(card.mana_value ?? card.full_scryfall_data?.mana_value ?? card.cmc ?? 0),
    power: card.power || card.full_scryfall_data?.power || null,
    toughness: card.toughness || card.full_scryfall_data?.toughness || null,
    colors: card.colors || card.full_scryfall_data?.colors || [],
    color_identity: card.color_identity || card.full_scryfall_data?.color_identity || [],
    keywords: card.keywords || card.full_scryfall_data?.keywords || [],
    card_faces: card.card_faces || card.full_scryfall_data?.card_faces || [],
    legalities: card.legalities || card.full_scryfall_data?.legalities || {},
    layout: card.layout || card.full_scryfall_data?.layout || null,
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
    packNumber: card.packNumber || null,
    sourcePackId: card.sourcePackId || null,
    boosterType: card.boosterType || null,
    bulkCardIndex: card.bulkCardIndex || null,
  };
}

function isStoredCollectionCard(card) {
  return Boolean(
    card?.collectionId && card?.id && card?.name && card?.imageUrl && card?.set,
  );
}

function notifyPackShardsUpdated() {
  window.dispatchEvent(new Event("packShardsUpdated"));
}

function notifyCollectionUpdated() {
  window.dispatchEvent(new Event("collectionUpdated"));
}

export function getCollection() {
  try {
    const savedCollection = localStorage.getItem(COLLECTION_KEY);
    const parsedCollection = savedCollection ? JSON.parse(savedCollection) : [];

    return Array.isArray(parsedCollection)
      ? parsedCollection
          .filter(isStoredCollectionCard)
          .map(normalizeStoredCollectionCard)
      : [];
  } catch {
    return [];
  }
}

export function getPackShards() {
  try {
    const savedShards = localStorage.getItem(PACK_SHARDS_KEY);
    const parsedShards = Number.parseInt(savedShards || "0", 10);

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
  return setPackShards(
    getPackShards() + Math.max(0, Number.parseInt(amount || 0, 10) || 0),
  );
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

<<<<<<< HEAD
=======
function getDuplicateCardKey(card) {
  return `${card.id}-${Boolean(card.isFoil) ? "foil" : "nonfoil"}`;
}

export function calculateDuplicateRewardsForBatch(existingCollection, newCards) {
  const ownedCounts = new Map();

  existingCollection.forEach((card) => {
    const key = getDuplicateCardKey(card);
    ownedCounts.set(key, (ownedCounts.get(key) || 0) + 1);
  });

  let duplicateCount = 0;
  const cardsWithDuplicateFlags = newCards.map((card) => {
    const key = getDuplicateCardKey(card);
    const ownedCount = ownedCounts.get(key) || 0;
    const isDuplicate = ownedCount > 0;

    ownedCounts.set(key, ownedCount + 1);

    if (isDuplicate) {
      duplicateCount += 1;
    }

    return {
      ...card,
      isDuplicatePull: isDuplicate,
    };
  });

  return {
    cardsWithDuplicateFlags,
    duplicateCount,
    shardsAwarded: duplicateCount * DUPLICATE_SHARD_REWARD,
  };
}

>>>>>>> cdad45f983029698b55070c669a2729f1e01b718
export function calculateDuplicateShardReward(cardsToSave, existingCollection) {
  const { duplicateCount, shardsAwarded } = calculateDuplicateRewardsForBatch(
    existingCollection,
    cardsToSave,
  );

  return {
    duplicateCount,
    shardsAwarded,
<<<<<<< HEAD
  };
}

function getDuplicateCardKey(card) {
  return `${card.id}-${Boolean(card.isFoil) ? "foil" : "nonfoil"}`;
}

export function calculateDuplicateRewardsForBatch(existingCollection, newCards) {
  const ownedCounts = new Map();

  existingCollection.forEach((card) => {
    const key = getDuplicateCardKey(card);
    ownedCounts.set(key, (ownedCounts.get(key) || 0) + 1);
  });

  let duplicateCount = 0;
  const cardsWithDuplicateFlags = newCards.map((card) => {
    const key = getDuplicateCardKey(card);
    const ownedCount = ownedCounts.get(key) || 0;
    const isDuplicate = ownedCount > 0;

    ownedCounts.set(key, ownedCount + 1);

    if (isDuplicate) {
      duplicateCount += 1;
    }

    return {
      ...card,
      isDuplicatePull: isDuplicate,
    };
  });

  return {
    cardsWithDuplicateFlags,
    duplicateCount,
    shardsAwarded: duplicateCount * DUPLICATE_SHARD_REWARD,
=======
>>>>>>> cdad45f983029698b55070c669a2729f1e01b718
  };
}

export function saveCardsToCollection(cards) {
  const currentCollection = getCollection();
  const openedAt = new Date().toISOString();
  const cardsToSave = cards
    .filter(isRealSaveableCard)
    .map((card) => normalizeCollectionCard(card, openedAt));
  const { cardsWithDuplicateFlags, duplicateCount, shardsAwarded } =
    calculateDuplicateRewardsForBatch(
<<<<<<< HEAD
    currentCollection,
    cardsToSave,
  );
=======
      currentCollection,
      cardsToSave,
    );
>>>>>>> cdad45f983029698b55070c669a2729f1e01b718
  const nextCollection = [...cardsWithDuplicateFlags, ...currentCollection];

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));
  notifyCollectionUpdated();

  const newShardBalance =
    shardsAwarded > 0 ? addPackShards(shardsAwarded) : getPackShards();

  return {
    savedCards: cardsWithDuplicateFlags,
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
  const nextCollection = getCollection().filter(
    (card) => card.collectionId !== collectionId,
  );

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));
  notifyCollectionUpdated();

  return nextCollection;
}

export function recycleCards(collectionIds) {
  const idsToRecycle = new Set(collectionIds);
  const currentCollection = getCollection();
  const recycledCards = currentCollection.filter((card) =>
    idsToRecycle.has(card.collectionId),
  );

  if (!recycledCards.length) {
    throw new Error("No matching collection cards were found to recycle.");
  }

  const updatedCollection = currentCollection.filter(
    (card) => !idsToRecycle.has(card.collectionId),
  );
  recycledCards.forEach(assertCanRecycleCard);

  const shardsAwarded = recycledCards.reduce(
    (total, card) => total + getRecycleShardValue(card),
    0,
  );

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
