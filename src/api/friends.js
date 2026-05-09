import { supabase } from '../lib/supabaseClient.js';
import { normalizeUsername } from '../utils/authUsername.js';

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to manage friends.');
  }

  return data.user.id;
}

async function getProfilesByIds(profileIds) {
  const ids = [...new Set(profileIds.filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);

  if (error) {
    throw new Error(error.message || 'Unable to load profiles.');
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

function attachProfile(request, key, profileMap) {
  return {
    ...request,
    [key]: profileMap.get(request[`${key}_id`]) || null,
  };
}

export async function searchProfilesByUsername(query) {
  const currentUserId = await getCurrentUserId();
  const normalizedQuery = normalizeUsername(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `${normalizedQuery}%`)
    .neq('id', currentUserId)
    .order('username', { ascending: true })
    .limit(12);

  if (error) {
    throw new Error(error.message || 'Unable to search users.');
  }

  return data || [];
}

export async function sendFriendRequest(receiverProfileId) {
  const senderId = await getCurrentUserId();

  if (senderId === receiverProfileId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  const { data: existingFriendship, error: friendshipError } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', senderId)
    .eq('friend_id', receiverProfileId)
    .maybeSingle();

  if (friendshipError) {
    throw new Error(friendshipError.message || 'Unable to check friendship status.');
  }

  if (existingFriendship) {
    throw new Error('You are already friends.');
  }

  const { data: existingRequest, error: requestCheckError } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverProfileId}),and(sender_id.eq.${receiverProfileId},receiver_id.eq.${senderId})`)
    .in('status', ['pending', 'accepted'])
    .limit(1)
    .maybeSingle();

  if (requestCheckError) {
    throw new Error(requestCheckError.message || 'Unable to check request status.');
  }

  if (existingRequest?.status === 'pending') {
    throw new Error('A friend request is already pending.');
  }

  const { data: reusableRequest, error: reusableRequestError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverProfileId)
    .in('status', ['declined', 'cancelled'])
    .limit(1)
    .maybeSingle();

  if (reusableRequestError) {
    throw new Error(reusableRequestError.message || 'Unable to check request history.');
  }

  if (reusableRequest) {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status: 'pending' })
      .eq('id', reusableRequest.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to send friend request.');
    }

    return data;
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverProfileId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A friend request already exists with that user.');
    }

    throw new Error(error.message || 'Unable to send friend request.');
  }

  return data;
}

export async function getIncomingFriendRequests() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load incoming requests.');
  }

  const profiles = await getProfilesByIds((data || []).map((request) => request.sender_id));
  return (data || []).map((request) => attachProfile(request, 'sender', profiles));
}

export async function getOutgoingFriendRequests() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load outgoing requests.');
  }

  const profiles = await getProfilesByIds((data || []).map((request) => request.receiver_id));
  return (data || []).map((request) => attachProfile(request, 'receiver', profiles));
}

export async function acceptFriendRequest(requestId) {
  const userId = await getCurrentUserId();
  const { data: request, error: loadError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .single();

  if (loadError) {
    throw new Error(loadError.message || 'Unable to load friend request.');
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(updateError.message || 'Unable to accept friend request.');
  }

  const friendshipRows = [
    { user_id: userId, friend_id: request.sender_id },
    { user_id: request.sender_id, friend_id: userId },
  ];
  const { error: friendshipError } = await supabase.from('friendships').upsert(friendshipRows, {
    onConflict: 'user_id,friend_id',
    ignoreDuplicates: true,
  });

  if (friendshipError) {
    throw new Error(friendshipError.message || 'Friend request accepted, but friendship rows could not be saved.');
  }

  return updatedRequest;
}

export async function declineFriendRequest(requestId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('receiver_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to decline friend request.');
  }
}

export async function cancelFriendRequest(requestId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('sender_id', userId);

  if (error) {
    throw new Error(error.message || 'Unable to cancel friend request.');
  }
}

export async function getFriends() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load friends.');
  }

  const profiles = await getProfilesByIds((data || []).map((friendship) => friendship.friend_id));

  return (data || []).map((friendship) => ({
    ...friendship,
    friend: profiles.get(friendship.friend_id) || null,
  }));
}

export async function removeFriend(friendUserId) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${userId})`);

  if (error) {
    throw new Error(error.message || 'Unable to remove friend.');
  }
}
