const COLLECTION_KEY = 'mtg-pack-opener-collection';

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
  return {
    collectionId: createCollectionId(),
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    imageUrl: card.imageUrl || card.image,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    isFoil: Boolean(card.isFoil),
    openedAt,
  };
}

function isStoredCollectionCard(card) {
  return Boolean(card?.collectionId && card?.id && card?.name && card?.imageUrl && card?.set);
}

export function getCollection() {
  try {
    const savedCollection = localStorage.getItem(COLLECTION_KEY);
    const parsedCollection = savedCollection ? JSON.parse(savedCollection) : [];

    return Array.isArray(parsedCollection) ? parsedCollection.filter(isStoredCollectionCard) : [];
  } catch {
    return [];
  }
}

export function saveCardsToCollection(cards) {
  const currentCollection = getCollection();
  const openedAt = new Date().toISOString();
  const cardsToSave = cards.filter(isRealSaveableCard).map((card) => normalizeCollectionCard(card, openedAt));
  const nextCollection = [...cardsToSave, ...currentCollection];

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));

  return cardsToSave;
}

export function clearCollection() {
  localStorage.removeItem(COLLECTION_KEY);
}

export function removeCardFromCollection(collectionId) {
  const nextCollection = getCollection().filter((card) => card.collectionId !== collectionId);

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(nextCollection));

  return nextCollection;
}
