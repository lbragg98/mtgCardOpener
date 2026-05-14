export function createBattleAnimationEvent(type, payload = {}) {
  return {
    createdAt: Date.now(),
    id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    ...payload,
  };
}

export function getPlayAnimationType(card) {
  if (card?.type === 'creature') return 'playCreature';
  if (card?.type === 'tokenSpell') return 'createToken';
  return 'castSpell';
}

export function getPrimaryEffectType(card) {
  return card?.effects?.[0]?.type || card?.type || 'generic';
}

export function getPrimaryEffectAmount(card) {
  const effect = card?.effects?.[0];

  if (!effect) return null;
  if (effect.type === 'buff') return `+${effect.attackBonus ?? effect.amount ?? 1}/+${effect.healthBonus ?? effect.amount ?? 1}`;
  if (effect.type === 'debuff') return `-${effect.attackPenalty ?? effect.amount ?? 1}/-${effect.healthPenalty ?? effect.amount ?? 1}`;
  if (['damage', 'drain', 'heal', 'draw', 'shield', 'discard'].includes(effect.type)) return effect.amount || 1;
  return null;
}
