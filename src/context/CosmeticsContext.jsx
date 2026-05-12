import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  equipShopItem as equipCloudShopItem,
  getEquippedCosmetics as getCloudEquippedCosmetics,
  getOwnedShopItems as getCloudOwnedShopItems,
  purchaseShopItem as purchaseCloudShopItem,
  unequipShopItem as unequipCloudShopItem,
} from '../api/shop.js';
import { useAuth } from './AuthContext.jsx';
import {
  equipShopItem as equipGuestShopItem,
  getEquippedCosmetics as getGuestEquippedCosmetics,
  getOwnedShopItems as getGuestOwnedShopItems,
  purchaseShopItem as purchaseGuestShopItem,
  unequipShopItem as unequipGuestShopItem,
} from '../utils/shopStorage.js';
import { getShopItemById } from '../utils/shopCatalog.js';

const CosmeticsContext = createContext(null);
const DEFAULT_EQUIPPED_COSMETICS = {};

function normalizeOwnedItems(items = []) {
  return items
    .map((item) => getShopItemById(item.itemId || item.id) || item)
    .filter(Boolean);
}

function normalizeEquippedCosmetics(equippedCosmetics = {}) {
  return Object.entries(equippedCosmetics).reduce((normalized, [equipSlot, value]) => {
    const itemId = typeof value === 'string' ? value : value?.itemId || value?.item_id || value?.item?.id;
    const item = value?.item || getShopItemById(itemId);

    if (item) {
      normalized[equipSlot] = item;
    }

    return normalized;
  }, {});
}

export function CosmeticsProvider({ children }) {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth();
  const [ownedItems, setOwnedItems] = useState([]);
  const [equippedCosmetics, setEquippedCosmetics] = useState(DEFAULT_EQUIPPED_COSMETICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const useCloudStorage = Boolean(user && isSupabaseConfigured);

  const refreshCosmetics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (useCloudStorage) {
        const [nextOwnedItems, nextEquippedCosmetics] = await Promise.all([
          getCloudOwnedShopItems(),
          getCloudEquippedCosmetics(),
        ]);

        setOwnedItems(normalizeOwnedItems(nextOwnedItems));
        setEquippedCosmetics(normalizeEquippedCosmetics(nextEquippedCosmetics));
        return;
      }

      setOwnedItems(normalizeOwnedItems(getGuestOwnedShopItems()));
      setEquippedCosmetics(normalizeEquippedCosmetics(getGuestEquippedCosmetics()));
    } catch (refreshError) {
      setError(refreshError.message || 'Unable to load cosmetics.');

      if (!useCloudStorage) {
        setOwnedItems([]);
        setEquippedCosmetics(DEFAULT_EQUIPPED_COSMETICS);
      }
    } finally {
      setLoading(false);
    }
  }, [useCloudStorage]);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    refreshCosmetics();

    function handleCosmeticsUpdate() {
      refreshCosmetics();
    }

    window.addEventListener('cosmeticsUpdated', handleCosmeticsUpdate);
    window.addEventListener('shopUpdated', handleCosmeticsUpdate);
    window.addEventListener('storage', handleCosmeticsUpdate);

    return () => {
      window.removeEventListener('cosmeticsUpdated', handleCosmeticsUpdate);
      window.removeEventListener('shopUpdated', handleCosmeticsUpdate);
      window.removeEventListener('storage', handleCosmeticsUpdate);
    };
  }, [authLoading, refreshCosmetics, user?.id]);

  const purchaseItem = useCallback(
    async (itemId) => {
      const result = useCloudStorage
        ? await purchaseCloudShopItem(itemId)
        : purchaseGuestShopItem(itemId);

      await refreshCosmetics();
      return result;
    },
    [refreshCosmetics, useCloudStorage],
  );

  const equipItem = useCallback(
    async (itemId) => {
      const result = useCloudStorage
        ? await equipCloudShopItem(itemId)
        : equipGuestShopItem(itemId);

      await refreshCosmetics();
      return result;
    },
    [refreshCosmetics, useCloudStorage],
  );

  const unequipItem = useCallback(
    async (equipSlot) => {
      const result = useCloudStorage
        ? await unequipCloudShopItem(equipSlot)
        : unequipGuestShopItem(equipSlot);

      await refreshCosmetics();
      return result;
    },
    [refreshCosmetics, useCloudStorage],
  );

  const isOwned = useCallback(
    (itemId) => ownedItems.some((item) => item.id === itemId || item.itemId === itemId),
    [ownedItems],
  );

  const isEquipped = useCallback(
    (itemId) => Object.values(equippedCosmetics).some((item) => item?.id === itemId || item?.itemId === itemId),
    [equippedCosmetics],
  );

  const getEquippedItem = useCallback(
    (equipSlot) => equippedCosmetics[equipSlot] || null,
    [equippedCosmetics],
  );

  const value = useMemo(
    () => ({
      ownedItems,
      equippedCosmetics,
      loading,
      error,
      refreshCosmetics,
      purchaseItem,
      equipItem,
      unequipItem,
      isOwned,
      isEquipped,
      getEquippedItem,
    }),
    [
      ownedItems,
      equippedCosmetics,
      loading,
      error,
      refreshCosmetics,
      purchaseItem,
      equipItem,
      unequipItem,
      isOwned,
      isEquipped,
      getEquippedItem,
    ],
  );

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}

export function useCosmetics() {
  const context = useContext(CosmeticsContext);

  if (!context) {
    throw new Error('useCosmetics must be used within CosmeticsProvider.');
  }

  return context;
}
