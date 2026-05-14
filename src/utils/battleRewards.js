import { addPackShards, getPackShards } from './collectionStorage.js';

const BATTLE_REWARD_KEY = 'binderBattleRewardStatus';
const DAILY_REWARD_LIMIT = 5;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readRewardStatus() {
  try {
    const parsedStatus = JSON.parse(localStorage.getItem(BATTLE_REWARD_KEY) || '{}');

    if (parsedStatus.date === getTodayKey()) {
      return {
        date: parsedStatus.date,
        rewardsEarned: Number(parsedStatus.rewardsEarned || 0),
        shardsEarned: Number(parsedStatus.shardsEarned || 0),
        wins: Number(parsedStatus.wins || 0),
      };
    }
  } catch {
    // Fall through to a fresh daily status.
  }

  return {
    date: getTodayKey(),
    rewardsEarned: 0,
    shardsEarned: 0,
    wins: 0,
  };
}

function writeRewardStatus(status) {
  localStorage.setItem(BATTLE_REWARD_KEY, JSON.stringify(status));
}

function getCardBattleValue(card) {
  const rarityScore = { common: 1, uncommon: 2, rare: 4, mythic: 6 }[card?.rarity] || 1;
  const keywordScore = (card?.keywords || []).length;
  const foilScore = card?.isFoil ? 2 : 0;
  const effectScore = (card?.effects || []).reduce((total, effect) => total + (effect.amount || effect.attack || 1), 0);

  return (card?.attack || 0) + (card?.health || 0) + rarityScore + keywordScore + foilScore + effectScore;
}

function getBestCard(deck = [], state) {
  const seenCards = [
    ...(state?.player?.battlefield || []),
    ...(state?.player?.graveyard || []),
    ...(state?.player?.hand || []),
  ];
  const candidateCards = seenCards.length ? seenCards : deck;

  return [...candidateCards].sort((a, b) => getCardBattleValue(b) - getCardBattleValue(a))[0] || null;
}

export function getBattleRewardStatus() {
  const status = readRewardStatus();

  return {
    ...status,
    remainingRewards: Math.max(0, DAILY_REWARD_LIMIT - status.rewardsEarned),
    limit: DAILY_REWARD_LIMIT,
  };
}

export function canEarnBattleReward() {
  return getBattleRewardStatus().remainingRewards > 0;
}

export function calculateBattleReward(result, deck = [], state) {
  const normalizedResult = result === 'won' || result === 'win' ? 'won' : 'lost';
  const status = getBattleRewardStatus();
  const canEarnReward = status.remainingRewards > 0;
  const bonuses = [];
  const baseAmount = normalizedResult === 'won' ? 100 : 25;

  if (normalizedResult === 'won' && (state?.player?.health || 0) >= 10) {
    bonuses.push({ amount: 25, label: 'Healthy Victory' });
  }

  if (normalizedResult === 'won' && deck.filter((card) => card?.isFoil).length >= 5) {
    bonuses.push({ amount: 25, label: 'Foil Deck Bonus' });
  }

  if (normalizedResult === 'won' && status.wins === 0) {
    bonuses.push({ amount: 100, label: 'First Win of the Day' });
  }

  const uncappedAmount = baseAmount + bonuses.reduce((total, bonus) => total + bonus.amount, 0);
  const amount = canEarnReward ? uncappedAmount : 0;

  return {
    amount,
    baseAmount: canEarnReward ? baseAmount : 0,
    bestCard: getBestCard(deck, state),
    bonuses: canEarnReward ? bonuses : [],
    capped: !canEarnReward,
    dailyStatus: status,
    damageDealt: Math.max(0, 20 - (state?.enemy?.health || 20)),
    result: normalizedResult,
    turnsTaken: state?.turnNumber || 1,
    uncappedAmount,
  };
}

export function recordBattleReward(amount, result = 'lost') {
  const status = readRewardStatus();
  const rewardAmount = Math.max(0, Number.parseInt(amount || 0, 10) || 0);
  const canRecordReward = status.rewardsEarned < DAILY_REWARD_LIMIT;
  const nextStatus = {
    ...status,
    rewardsEarned: canRecordReward ? status.rewardsEarned + 1 : status.rewardsEarned,
    shardsEarned: canRecordReward ? status.shardsEarned + rewardAmount : status.shardsEarned,
    wins: result === 'won' ? status.wins + 1 : status.wins,
  };

  writeRewardStatus(nextStatus);

  const newShardBalance = canRecordReward && rewardAmount > 0 ? addPackShards(rewardAmount) : getPackShards();

  return {
    ...getBattleRewardStatus(),
    amount: canRecordReward ? rewardAmount : 0,
    newShardBalance,
  };
}
