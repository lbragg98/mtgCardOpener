// PvP battle API: challenges, matches, and AI-friend-deck games stored in Supabase.
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { createInitialBattleState } from '../utils/battleEngine.js';
import { mapCollectionCardToBattleCard } from '../utils/battleCardMapper.js';

const VALID_DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const HUMAN_MODE = 'human';
const AI_FRIEND_DECK_MODE = 'ai_friend_deck';
const REQUIRED_DECK_SIZE = 20;

async function getCurrentUserId() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for friend battles.');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to use friend battles.');
  }

  return data.user.id;
}

function normalizeDifficulty(aiDifficulty = 'normal') {
  return VALID_DIFFICULTIES.has(aiDifficulty) ? aiDifficulty : 'normal';
}

function normalizeDeckRow(row) {
  if (!row) return null;

  return {
    cards: Array.isArray(row.cards) ? row.cards : [],
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function normalizeChallenge(row) {
  if (!row) return null;

  return {
    ...row,
    aiDifficulty: row.ai_difficulty,
    createdAt: row.created_at,
    receiverDeckId: row.receiver_deck_id,
    receiverId: row.receiver_id,
    senderDeckId: row.sender_deck_id,
    senderId: row.sender_id,
    updatedAt: row.updated_at,
  };
}

function normalizeMatch(row) {
  if (!row) return null;

  return {
    ...row,
    aiControlledUserId: row.ai_controlled_user_id,
    aiDifficulty: row.ai_difficulty,
    challengeId: row.challenge_id,
    createdAt: row.created_at,
    currentTurnUserId: row.current_turn_user_id,
    gameState: row.game_state || {},
    lastAction: row.last_action || {},
    playerOneDeck: Array.isArray(row.player_one_deck) ? row.player_one_deck : [],
    playerOneId: row.player_one_id,
    playerTwoDeck: Array.isArray(row.player_two_deck) ? row.player_two_deck : [],
    playerTwoId: row.player_two_id,
    turnNumber: row.turn_number,
    updatedAt: row.updated_at,
    winnerId: row.winner_id,
  };
}

function battleReadyCard(card) {
  if (!card) return null;

  if (card.battleId && card.type && Number.isFinite(Number(card.cost))) {
    return card;
  }

  return mapCollectionCardToBattleCard(card);
}

function prepareBattleDeck(deck) {
  // PvP stores battle-ready non-land cards so both clients resolve the same state.
  const mappedCards = (deck?.cards || [])
    .map(battleReadyCard)
    .filter((card) => card && card.type !== 'land')
    .slice(0, REQUIRED_DECK_SIZE);

  if (mappedCards.length !== REQUIRED_DECK_SIZE) {
    throw new Error(`${deck?.name || 'This deck'} must contain exactly ${REQUIRED_DECK_SIZE} non-land battle cards.`);
  }

  return mappedCards;
}

async function assertNotSelf(currentUserId, otherUserId) {
  if (!otherUserId) {
    throw new Error('Choose a friend to challenge.');
  }

  if (currentUserId === otherUserId) {
    throw new Error('You cannot challenge yourself.');
  }
}

async function assertFriend(currentUserId, friendUserId) {
  await assertNotSelf(currentUserId, friendUserId);

  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', currentUserId)
    .eq('friend_id', friendUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to verify friendship.');
  }

  if (!data) {
    throw new Error('You can only challenge friends to Binder Battle.');
  }
}

async function getBattleDeckForUser(deckId, userId) {
  if (!deckId) {
    throw new Error('Choose a valid battle deck.');
  }

  const { data, error } = await supabase
    .from('battle_decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load battle deck.');
  }

  if (!data) {
    throw new Error('Battle deck was not found or is not available.');
  }

  const deck = normalizeDeckRow(data);
  prepareBattleDeck(deck);

  return deck;
}

async function getChallengeForUser(challengeId, userId) {
  const { data, error } = await supabase
    .from('battle_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load battle challenge.');
  }

  if (!data || (data.sender_id !== userId && data.receiver_id !== userId)) {
    throw new Error('Battle challenge was not found.');
  }

  return data;
}

function createStoredBattleState(playerOneDeck, playerTwoDeck) {
  return createInitialBattleState(playerOneDeck, playerTwoDeck);
}

function getCurrentTurnUserId(match, nextGameState) {
  if (nextGameState?.status !== 'playing') return null;
  return nextGameState?.activePlayer === 'enemy' ? match.player_two_id : match.player_one_id;
}

function getWinnerId(match, nextGameState) {
  if (nextGameState?.status === 'won') return match.player_one_id;
  if (nextGameState?.status === 'lost') return match.player_two_id;
  return null;
}

function getWinnerIdFromMatch(match, nextGameState) {
  if (nextGameState?.status === 'won') return match.playerOneId || match.player_one_id;
  if (nextGameState?.status === 'lost') return match.playerTwoId || match.player_two_id;
  return null;
}

async function insertBattleMatch({
  aiControlledUserId = null,
  aiDifficulty = 'normal',
  challengeId = null,
  mode = HUMAN_MODE,
  playerOneDeck,
  playerOneId,
  playerTwoDeck,
  playerTwoId,
}) {
  const gameState = createStoredBattleState(playerOneDeck, playerTwoDeck);

  const { data, error } = await supabase
    .from('battle_matches')
    .insert({
      ai_controlled_user_id: aiControlledUserId,
      ai_difficulty: normalizeDifficulty(aiDifficulty),
      challenge_id: challengeId,
      current_turn_user_id: playerOneId,
      game_state: gameState,
      mode,
      player_one_deck: playerOneDeck,
      player_one_id: playerOneId,
      player_two_deck: playerTwoDeck,
      player_two_id: playerTwoId,
      status: 'active',
      turn_number: gameState.turnNumber || 1,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to create battle match.');
  }

  return normalizeMatch(data);
}

export async function sendBattleChallenge(friendUserId, senderDeckId, message = '') {
  const userId = await getCurrentUserId();
  await assertFriend(userId, friendUserId);
  await getBattleDeckForUser(senderDeckId, userId);

  const { data, error } = await supabase
    .from('battle_challenges')
    .insert({
      message: message?.trim() || null,
      mode: HUMAN_MODE,
      receiver_id: friendUserId,
      sender_deck_id: senderDeckId,
      sender_id: userId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to send battle challenge.');
  }

  window.dispatchEvent(new Event('battleChallengesUpdated'));
  return normalizeChallenge(data);
}

export async function sendAIFriendDeckChallenge(friendUserId, senderDeckId, receiverDeckId, aiDifficulty = 'normal') {
  const userId = await getCurrentUserId();
  await assertFriend(userId, friendUserId);
  await getBattleDeckForUser(senderDeckId, userId);
  await getBattleDeckForUser(receiverDeckId, friendUserId);

  const { data, error } = await supabase
    .from('battle_challenges')
    .insert({
      ai_difficulty: normalizeDifficulty(aiDifficulty),
      mode: AI_FRIEND_DECK_MODE,
      receiver_deck_id: receiverDeckId,
      receiver_id: friendUserId,
      sender_deck_id: senderDeckId,
      sender_id: userId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to send AI friend-deck challenge.');
  }

  window.dispatchEvent(new Event('battleChallengesUpdated'));
  return normalizeChallenge(data);
}

export async function getIncomingBattleChallenges() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_challenges')
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load incoming battle challenges.');
  }

  return (data || []).map(normalizeChallenge);
}

export async function getOutgoingBattleChallenges() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_challenges')
    .select('*')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load outgoing battle challenges.');
  }

  return (data || []).map(normalizeChallenge);
}

export async function acceptBattleChallenge(challengeId, receiverDeckId) {
  const userId = await getCurrentUserId();
  const challenge = await getChallengeForUser(challengeId, userId);

  if (challenge.receiver_id !== userId) {
    throw new Error('Only the challenged friend can accept this battle.');
  }

  if (challenge.status !== 'pending') {
    throw new Error('This battle challenge is no longer pending.');
  }

  const senderDeck = await getBattleDeckForUser(challenge.sender_deck_id, challenge.sender_id);
  const receiverDeck = await getBattleDeckForUser(receiverDeckId, userId);
  const playerOneDeck = prepareBattleDeck(senderDeck);
  const playerTwoDeck = prepareBattleDeck(receiverDeck);
  const match = await insertBattleMatch({
    aiControlledUserId: challenge.mode === AI_FRIEND_DECK_MODE ? userId : null,
    aiDifficulty: challenge.ai_difficulty,
    challengeId: challenge.id,
    mode: challenge.mode || HUMAN_MODE,
    playerOneDeck,
    playerOneId: challenge.sender_id,
    playerTwoDeck,
    playerTwoId: userId,
  });

  const { data, error } = await supabase
    .from('battle_challenges')
    .update({
      receiver_deck_id: receiverDeckId,
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('receiver_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to accept battle challenge.');
  }

  window.dispatchEvent(new Event('battleChallengesUpdated'));
  window.dispatchEvent(new Event('battleMatchesUpdated'));
  return { challenge: normalizeChallenge(data), match };
}

export async function declineBattleChallenge(challengeId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_challenges')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', challengeId)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to decline battle challenge.');
  }

  window.dispatchEvent(new Event('battleChallengesUpdated'));
  return normalizeChallenge(data);
}

export async function cancelBattleChallenge(challengeId) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_challenges')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', challengeId)
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to cancel battle challenge.');
  }

  window.dispatchEvent(new Event('battleChallengesUpdated'));
  return normalizeChallenge(data);
}

export async function createAIFriendDeckMatch(friendUserId, senderDeckId, receiverDeckId, aiDifficulty = 'normal') {
  const userId = await getCurrentUserId();
  await assertFriend(userId, friendUserId);

  const senderDeck = await getBattleDeckForUser(senderDeckId, userId);
  const receiverDeck = await getBattleDeckForUser(receiverDeckId, friendUserId);
  const match = await insertBattleMatch({
    aiControlledUserId: friendUserId,
    aiDifficulty,
    mode: AI_FRIEND_DECK_MODE,
    playerOneDeck: prepareBattleDeck(senderDeck),
    playerOneId: userId,
    playerTwoDeck: prepareBattleDeck(receiverDeck),
    playerTwoId: friendUserId,
  });

  window.dispatchEvent(new Event('battleMatchesUpdated'));
  return match;
}

export async function getMyActiveBattleMatches() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_matches')
    .select('*')
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load active battle matches.');
  }

  return (data || []).map(normalizeMatch);
}

export async function getBattleMatch(matchId) {
  const { data, error } = await supabase.from('battle_matches').select('*').eq('id', matchId).single();

  if (error) {
    throw new Error(error.message || 'Unable to load battle match.');
  }

  return normalizeMatch(data);
}

export async function updateBattleMatchState(matchId, nextGameState, lastAction = {}) {
  return submitBattleAction(matchId, 'stateUpdate', lastAction, nextGameState);
}

export async function submitBattleAction(matchId, actionType, actionPayload = {}, nextGameState = {}, options = {}) {
  const match = await getBattleMatch(matchId);
  const winnerId = options.winnerId ?? getWinnerIdFromMatch(match, nextGameState);
  const nextTurnUserId = options.nextTurnUserId ?? getCurrentTurnUserId(match, nextGameState);
  const { data, error } = await supabase.rpc('submit_battle_action', {
    p_action_payload: actionPayload || {},
    p_action_type: actionType,
    p_match_id: matchId,
    p_next_game_state: nextGameState || {},
    p_next_turn_user_id: nextTurnUserId,
    p_winner_id: winnerId,
  });

  if (error) {
    throw new Error(error.message || 'Unable to submit battle action.');
  }

  window.dispatchEvent(new Event('battleMatchesUpdated'));
  return normalizeMatch(data);
}

export async function recordBattleAction(matchId, actionType, actionPayload = {}) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('battle_match_actions')
    .insert({
      action_payload: actionPayload || {},
      action_type: actionType,
      actor_id: userId,
      match_id: matchId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to record battle action.');
  }

  return data;
}

export async function forfeitBattleMatch(matchId) {
  const userId = await getCurrentUserId();
  const match = await getBattleMatch(matchId);

  if (match.player_one_id !== userId && match.player_two_id !== userId) {
    throw new Error('You are not part of this battle match.');
  }

  const winnerId = match.player_one_id === userId ? match.player_two_id : match.player_one_id;
  const nextGameState = {
    ...(match.gameState || match.game_state || {}),
    status: match.player_one_id === userId ? 'lost' : 'won',
  };

  return submitBattleAction(matchId, 'forfeit', { winnerId }, nextGameState, {
    nextTurnUserId: null,
    winnerId,
  });
}
