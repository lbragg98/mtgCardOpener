import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { addPackShards, getPackShards, setPackShards, spendPackShards } from '../utils/collectionStorage.js';

function normalizeAmount(amount) {
  return Math.max(0, Number.parseInt(amount || 0, 10) || 0);
}

function normalizeWalletBalance(row) {
  return normalizeAmount(row?.pack_shards);
}

async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('You need to be logged in to sync Pack Shards.');
  }

  return user;
}

function cacheCloudBalance(row) {
  return setPackShards(normalizeWalletBalance(row));
}

export async function syncPackShardsFromCloud({ migrateLocal = true } = {}) {
  const user = await getCurrentUser();

  if (!user) {
    return getPackShards();
  }

  const { data, error } = await supabase.rpc('ensure_user_wallet', {
    p_initial_shards: migrateLocal ? getPackShards() : 0,
  });

  if (error) {
    throw new Error(error.message || 'Unable to sync Pack Shards.');
  }

  return cacheCloudBalance(data);
}

export async function getCloudPackShards() {
  return syncPackShardsFromCloud({ migrateLocal: true });
}

export async function addCloudPackShards(amount) {
  const user = await getCurrentUser();
  const shardAmount = normalizeAmount(amount);

  if (!user) {
    return addPackShards(shardAmount);
  }

  if (shardAmount <= 0) {
    return syncPackShardsFromCloud({ migrateLocal: true });
  }

  const { data, error } = await supabase.rpc('adjust_pack_shards', {
    p_delta: shardAmount,
  });

  if (error) {
    throw new Error(error.message || 'Unable to add Pack Shards.');
  }

  return cacheCloudBalance(data);
}

export async function spendCloudPackShards(amount) {
  const user = await getCurrentUser();
  const shardAmount = normalizeAmount(amount);

  if (!user) {
    if (!spendPackShards(shardAmount)) {
      throw new Error('Not enough Pack Shards.');
    }

    return getPackShards();
  }

  if (shardAmount <= 0) {
    return syncPackShardsFromCloud({ migrateLocal: true });
  }

  const { data, error } = await supabase.rpc('adjust_pack_shards', {
    p_delta: -shardAmount,
  });

  if (error) {
    throw new Error(error.message || 'Not enough Pack Shards.');
  }

  return cacheCloudBalance(data);
}

export async function subscribeToPackShardWallet(onBalance) {
  const user = await requireCurrentUser();

  const channel = supabase
    .channel(`user-wallet-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_wallets',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const row = payload.new || payload.old;
        const balance = cacheCloudBalance(row);
        onBalance?.(balance);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
