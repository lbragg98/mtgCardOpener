import { getPackShards, spendPackShards } from './collectionStorage.js';
import { getShopItemById } from './shopCatalog.js';

const OWNED_SHOP_ITEMS_KEY = 'ownedShopItems';
const EQUIPPED_COSMETICS_KEY = 'equippedCosmetics';

function notifyShopUpdated() {
  window.dispatchEvent(new Event('shopUpdated'));
}

function notifyCosmeticsUpdated() {
  window.dispatchEvent(new Event('cosmeticsUpdated'));
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeOwnedItem(itemId, purchasedAt = new Date().toISOString()) {
  const item = getShopItemById(itemId);

  return item
    ? {
        ...item,
        itemId,
        purchasedAt,
      }
    : null;
}

export function getOwnedShopItems() {
  const ownedItems = readJson(OWNED_SHOP_ITEMS_KEY, []);

  return Array.isArray(ownedItems)
    ? ownedItems
        .map((entry) => normalizeOwnedItem(entry.itemId || entry.id || entry, entry.purchasedAt))
        .filter(Boolean)
    : [];
}

export function getEquippedCosmetics() {
  const equippedCosmetics = readJson(EQUIPPED_COSMETICS_KEY, {});

  return equippedCosmetics && typeof equippedCosmetics === 'object' ? equippedCosmetics : {};
}

export function userOwnsItem(itemId) {
  return getOwnedShopItems().some((item) => item.itemId === itemId || item.id === itemId);
}

export function purchaseShopItem(itemId) {
  const item = getShopItemById(itemId);

  if (!item) {
    throw new Error('Shop item not found.');
  }

  if (userOwnsItem(itemId)) {
    throw new Error('You already own this cosmetic.');
  }

  if (getPackShards() < item.price) {
    throw new Error(`Need ${(item.price - getPackShards()).toLocaleString()} more Pack Shards.`);
  }

  if (!spendPackShards(item.price)) {
    throw new Error('Not enough Pack Shards.');
  }

  const ownedItems = [
    ...readJson(OWNED_SHOP_ITEMS_KEY, []),
    {
      itemId,
      purchasedAt: new Date().toISOString(),
    },
  ];

  writeJson(OWNED_SHOP_ITEMS_KEY, ownedItems);
  window.dispatchEvent(new Event('packShardsUpdated'));
  notifyShopUpdated();

  return {
    ownedItems: getOwnedShopItems(),
    newShardBalance: getPackShards(),
  };
}

export function equipShopItem(itemId) {
  const item = getShopItemById(itemId);

  if (!item) {
    throw new Error('Shop item not found.');
  }

  if (item.price > 0 && !userOwnsItem(itemId)) {
    throw new Error('You need to own this cosmetic before equipping it.');
  }

  const equippedCosmetics = {
    ...getEquippedCosmetics(),
    [item.equipSlot]: itemId,
  };

  writeJson(EQUIPPED_COSMETICS_KEY, equippedCosmetics);
  notifyCosmeticsUpdated();

  return equippedCosmetics;
}

export function unequipShopItem(equipSlot) {
  const equippedCosmetics = { ...getEquippedCosmetics() };
  delete equippedCosmetics[equipSlot];

  writeJson(EQUIPPED_COSMETICS_KEY, equippedCosmetics);
  notifyCosmeticsUpdated();

  return equippedCosmetics;
}
