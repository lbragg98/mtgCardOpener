import { getPackShards, spendPackShards } from './collectionStorage.js';
import { getCatalogBinderById } from './binderCatalog.js';

const OWNED_BINDERS_KEY = 'mtg-pack-opener-owned-binders';

function createOwnedBinderId(binderId) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${binderId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function notifyBindersUpdated() {
  window.dispatchEvent(new Event('bindersUpdated'));
}

function saveOwnedBinders(binders) {
  localStorage.setItem(OWNED_BINDERS_KEY, JSON.stringify(binders));
  notifyBindersUpdated();
}

function isStoredOwnedBinder(binder) {
  return Boolean(
    binder?.ownedBinderId &&
      binder?.binderId &&
      getCatalogBinderById(binder.binderId) &&
      Array.isArray(binder.cards),
  );
}

export function getOwnedBinders() {
  try {
    const savedBinders = localStorage.getItem(OWNED_BINDERS_KEY);
    const parsedBinders = savedBinders ? JSON.parse(savedBinders) : [];

    return Array.isArray(parsedBinders) ? parsedBinders.filter(isStoredOwnedBinder) : [];
  } catch {
    return [];
  }
}

export function getBinderById(binderId) {
  return getOwnedBinders().find((binder) => binder.ownedBinderId === binderId || binder.binderId === binderId) || null;
}

export function getOwnedBinderById(ownedBinderId) {
  return getOwnedBinders().find((binder) => binder.ownedBinderId === ownedBinderId) || null;
}

export function isBinderOwned(binderId) {
  return getOwnedBinders().some((binder) => binder.binderId === binderId);
}

export function purchaseBinder(binderId) {
  const catalogBinder = getCatalogBinderById(binderId);

  if (!catalogBinder) {
    throw new Error('Binder not found.');
  }

  if (isBinderOwned(binderId)) {
    throw new Error('You already own this binder.');
  }

  const currentShards = getPackShards();

  if (currentShards < catalogBinder.price) {
    throw new Error(`Need ${(catalogBinder.price - currentShards).toLocaleString()} more Pack Shards.`);
  }

  const didSpend = spendPackShards(catalogBinder.price);

  if (!didSpend) {
    throw new Error('Not enough Pack Shards.');
  }

  const ownedBinder = {
    ownedBinderId: createOwnedBinderId(binderId),
    binderId,
    purchasedAt: new Date().toISOString(),
    cards: [],
  };
  const updatedBinders = [...getOwnedBinders(), ownedBinder];

  saveOwnedBinders(updatedBinders);
  window.dispatchEvent(new Event('packShardsUpdated'));

  return {
    binder: ownedBinder,
    catalogBinder,
    newShardBalance: getPackShards(),
    updatedBinders,
  };
}

export function addCardToBinder(binderId, collectionId) {
  return addCardsToBinder(binderId, [collectionId]);
}

export function addCardsToBinder(binderId, collectionIds) {
  const ownedBinders = getOwnedBinders();
  const binderIndex = ownedBinders.findIndex((binder) => binder.ownedBinderId === binderId || binder.binderId === binderId);

  if (binderIndex === -1) {
    throw new Error('Binder not found.');
  }

  const ownedBinder = ownedBinders[binderIndex];
  const catalogBinder = getCatalogBinderById(ownedBinder.binderId);
  const uniqueCollectionIds = [...new Set(collectionIds)].filter(Boolean);
  const newCollectionIds = uniqueCollectionIds.filter((collectionId) => !ownedBinder.cards.includes(collectionId));

  if (!newCollectionIds.length) {
    return ownedBinder;
  }

  const availableSlots = catalogBinder.capacity - ownedBinder.cards.length;

  if (availableSlots <= 0) {
    throw new Error('This binder is full.');
  }

  if (newCollectionIds.length > availableSlots) {
    throw new Error(`Only ${availableSlots} slot${availableSlots === 1 ? '' : 's'} available in this binder.`);
  }

  const updatedBinder = {
    ...ownedBinder,
    cards: [...ownedBinder.cards, ...newCollectionIds],
  };
  const updatedBinders = ownedBinders.map((binder, index) => (index === binderIndex ? updatedBinder : binder));

  saveOwnedBinders(updatedBinders);

  return updatedBinder;
}

export function removeCardFromBinder(binderId, collectionId) {
  const ownedBinders = getOwnedBinders();
  const binderIndex = ownedBinders.findIndex((binder) => binder.ownedBinderId === binderId || binder.binderId === binderId);

  if (binderIndex === -1) {
    throw new Error('Binder not found.');
  }

  const ownedBinder = ownedBinders[binderIndex];
  const updatedBinder = {
    ...ownedBinder,
    cards: ownedBinder.cards.filter((cardId) => cardId !== collectionId),
  };
  const updatedBinders = ownedBinders.map((binder, index) => (index === binderIndex ? updatedBinder : binder));

  saveOwnedBinders(updatedBinders);

  return updatedBinder;
}

export function updateBinderCosmetics(binderId, cosmetics = {}) {
  const ownedBinders = getOwnedBinders();
  const binderIndex = ownedBinders.findIndex((binder) => binder.ownedBinderId === binderId || binder.binderId === binderId);

  if (binderIndex === -1) {
    throw new Error('Binder not found.');
  }

  const updatedBinder = {
    ...ownedBinders[binderIndex],
    equippedClaspId: cosmetics.equippedClaspId || '',
    equippedPageStyleId: cosmetics.equippedPageStyleId || '',
    equippedSlotFrameId: cosmetics.equippedSlotFrameId || '',
    equippedAuraId: cosmetics.equippedAuraId || '',
  };
  const updatedBinders = ownedBinders.map((binder, index) => (index === binderIndex ? updatedBinder : binder));

  saveOwnedBinders(updatedBinders);

  return updatedBinder;
}

export function getBinderCards(binderId) {
  return getBinderById(binderId)?.cards || [];
}
