import { supabase } from '../lib/supabaseClient.js';
import { getShopItemById } from '../utils/shopCatalog.js';
import { addCloudPackShards, getCloudPackShards, spendCloudPackShards } from './packShards.js';

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use cloud shop storage.');
  }

  return data.user.id;
}

function normalizeOwnedShopItem(row) {
  const item = getShopItemById(row.item_id);

  return item
    ? {
        ...item,
        ownedShopItemId: row.id,
        itemId: row.item_id,
        userId: row.user_id,
        purchasedAt: row.purchased_at,
      }
    : null;
}

function normalizeEquippedCosmetic(row) {
  const item = getShopItemById(row.item_id);

  return {
    id: row.id,
    userId: row.user_id,
    equipSlot: row.equip_slot,
    itemId: row.item_id,
    updatedAt: row.updated_at,
    item,
  };
}

export async function getOwnedShopItems() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_shop_items')
    .select('*')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load owned cosmetics.');
  }

  return (data || []).map(normalizeOwnedShopItem).filter(Boolean);
}

export async function getEquippedCosmetics() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_equipped_cosmetics')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to load equipped cosmetics.');
  }

  return (data || []).reduce((equipped, row) => {
    const normalizedRow = normalizeEquippedCosmetic(row);
    equipped[normalizedRow.equipSlot] = normalizedRow;
    return equipped;
  }, {});
}

export async function userOwnsItem(itemId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('user_shop_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to check cosmetic ownership.');
  }

  return Boolean(data);
}

export async function purchaseShopItem(itemId) {
  const userId = await getCurrentUserId();
  const item = getShopItemById(itemId);

  if (!item) {
    throw new Error('Shop item not found.');
  }

  if (await userOwnsItem(itemId)) {
    throw new Error('You already own this cosmetic.');
  }

  const currentShards = await getCloudPackShards();

  if (currentShards < item.price) {
    throw new Error(`Need ${(item.price - currentShards).toLocaleString()} more Pack Shards.`);
  }

  const newShardBalance = await spendCloudPackShards(item.price);

  const { error } = await supabase.from('user_shop_items').insert({
    user_id: userId,
    item_id: itemId,
  });

  if (error) {
    await addCloudPackShards(item.price);
    throw new Error(error.message || 'Unable to purchase cosmetic.');
  }

  window.dispatchEvent(new Event('packShardsUpdated'));
  window.dispatchEvent(new Event('shopUpdated'));

  return {
    ownedItems: await getOwnedShopItems(),
    newShardBalance,
  };
}

export async function equipShopItem(itemId) {
  const userId = await getCurrentUserId();
  const item = getShopItemById(itemId);

  if (!item) {
    throw new Error('Shop item not found.');
  }

  if (item.price > 0 && !(await userOwnsItem(itemId))) {
    throw new Error('You need to own this cosmetic before equipping it.');
  }

  const { data, error } = await supabase
    .from('user_equipped_cosmetics')
    .upsert(
      {
        user_id: userId,
        equip_slot: item.equipSlot,
        item_id: itemId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,equip_slot' },
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to equip cosmetic.');
  }

  window.dispatchEvent(new Event('cosmeticsUpdated'));

  return normalizeEquippedCosmetic(data);
}

export async function unequipShopItem(equipSlot) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('user_equipped_cosmetics')
    .delete()
    .eq('user_id', userId)
    .eq('equip_slot', equipSlot);

  if (error) {
    throw new Error(error.message || 'Unable to unequip cosmetic.');
  }

  window.dispatchEvent(new Event('cosmeticsUpdated'));

  return getEquippedCosmetics();
}
