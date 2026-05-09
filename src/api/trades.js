import { supabase } from '../lib/supabaseClient.js';
import { normalizeUserCardRow } from './userCards.js';

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to trade cards.');
  }

  return data.user.id;
}

async function getProfilesByIds(profileIds) {
  const ids = [...new Set(profileIds.filter(Boolean))];

  if (!ids.length) return new Map();

  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);

  if (error) {
    throw new Error(error.message || 'Unable to load trade profiles.');
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function assertFriend(receiverId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', receiverId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to verify friendship.');
  }

  if (!data) {
    throw new Error('You can only trade with friends.');
  }

  return userId;
}

async function getUserCardsByIds(cardIds) {
  const ids = [...new Set(cardIds.filter(Boolean))];

  if (!ids.length) return new Map();

  const { data, error } = await supabase.from('user_cards').select('*').in('id', ids);

  if (error) {
    throw new Error(error.message || 'Unable to load trade cards.');
  }

  return new Map((data || []).map((row) => [row.id, normalizeUserCardRow(row)]));
}

function hydrateTrade(trade, profiles, cardsById) {
  const items = trade.trade_items || [];
  const offeredItems = items
    .filter((item) => item.side === 'offered')
    .map((item) => ({ ...item, card: cardsById.get(item.user_card_id) || null }));
  const requestedItems = items
    .filter((item) => item.side === 'requested')
    .map((item) => ({ ...item, card: cardsById.get(item.user_card_id) || null }));

  return {
    ...trade,
    sender: profiles.get(trade.sender_id) || null,
    receiver: profiles.get(trade.receiver_id) || null,
    offeredItems,
    requestedItems,
  };
}

async function hydrateTrades(trades) {
  const profiles = await getProfilesByIds(trades.flatMap((trade) => [trade.sender_id, trade.receiver_id]));
  const cardsById = await getUserCardsByIds(
    trades.flatMap((trade) => (trade.trade_items || []).map((item) => item.user_card_id)),
  );

  return trades.map((trade) => hydrateTrade(trade, profiles, cardsById));
}

export async function createTrade(receiverId, offeredCardIds, requestedCardIds, message = '') {
  const senderId = await assertFriend(receiverId);
  const offeredIds = [...new Set(offeredCardIds.filter(Boolean))];
  const requestedIds = [...new Set(requestedCardIds.filter(Boolean))];

  if (!offeredIds.length && !requestedIds.length) {
    throw new Error('Choose at least one card to trade.');
  }

  const offeredCards = await getUserCardsByIds(offeredIds);
  const requestedCards = await getUserCardsByIds(requestedIds);

  if (offeredIds.some((id) => !offeredCards.get(id) || offeredCards.get(id).user_id !== senderId)) {
    throw new Error('You can only offer cards you own.');
  }

  if (requestedIds.some((id) => !requestedCards.get(id) || requestedCards.get(id).user_id !== receiverId)) {
    throw new Error('You can only request cards your friend owns.');
  }

  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      message: message.trim() || null,
    })
    .select('*')
    .single();

  if (tradeError) {
    throw new Error(tradeError.message || 'Unable to create trade.');
  }

  const tradeItems = [
    ...offeredIds.map((cardId) => ({
      trade_id: trade.id,
      user_id: senderId,
      user_card_id: cardId,
      side: 'offered',
    })),
    ...requestedIds.map((cardId) => ({
      trade_id: trade.id,
      user_id: receiverId,
      user_card_id: cardId,
      side: 'requested',
    })),
  ];

  const { error: itemsError } = await supabase.from('trade_items').insert(tradeItems);

  if (itemsError) {
    await supabase.from('trades').delete().eq('id', trade.id);
    throw new Error(itemsError.message || 'Unable to attach cards to trade.');
  }

  return getTradeById(trade.id);
}

export async function getMyTrades() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('trades')
    .select('*, trade_items(*)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load trades.');
  }

  return hydrateTrades(data || []);
}

export async function getTradeById(tradeId) {
  const { data, error } = await supabase
    .from('trades')
    .select('*, trade_items(*)')
    .eq('id', tradeId)
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to load trade.');
  }

  return (await hydrateTrades([data]))[0];
}

export async function acceptTrade(tradeId) {
  const { data, error } = await supabase.rpc('accept_trade', { p_trade_id: tradeId });

  if (error) {
    throw new Error(error.message || 'Trade could not complete because one or more cards are no longer available.');
  }

  window.dispatchEvent(new Event('collectionUpdated'));
  return data;
}

export async function declineTrade(tradeId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('trades')
    .update({ status: 'declined' })
    .eq('id', tradeId)
    .eq('receiver_id', userId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message || 'Unable to decline trade.');
  }
}

export async function cancelTrade(tradeId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('trades')
    .update({ status: 'cancelled' })
    .eq('id', tradeId)
    .eq('sender_id', userId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message || 'Unable to cancel trade.');
  }
}
