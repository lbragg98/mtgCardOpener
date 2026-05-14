import {
  getColorBalanceModifier,
  getColorCombinationName,
  getColorEffectProfile,
  getColorSignature,
  getColorStrategy,
  getPrimaryColor as getBattlePrimaryColor,
  normalizeColors,
} from './battleColors.js';
import { getBattleCardOverride, normalizeArenaCardName } from './battleCardOverrides.js';

const RARITY_BONUS = { common: 0, uncommon: 0, rare: 1, mythic: 2 };
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const SUPPORTED_KEYWORDS = {
  deathtouch: 'Deathtouch',
  defender: 'Defender',
  'first strike': 'First strike',
  flying: 'Flying',
  haste: 'Haste',
  lifelink: 'Lifelink',
  menace: 'Menace',
  trample: 'Trample',
  vigilance: 'Vigilance',
};

function clampCost(value) {
  const cost = Number(value);
  return Math.min(10, Math.max(1, Number.isFinite(cost) ? Math.ceil(cost) : 1));
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTextValue(object, snakeKey, camelKey) {
  return object?.[snakeKey] || object?.[camelKey] || '';
}

function getField(card, fieldName, fallback = null) {
  return card?.[fieldName] ?? card?.full_scryfall_data?.[fieldName] ?? fallback;
}

function getCardFaces(card) {
  return getField(card, 'card_faces', []) || [];
}

export function getMainFace(card) {
  if (getField(card, 'type_line') || card?.typeLine || getField(card, 'oracle_text') || card?.oracleText) return card;
  const faces = getCardFaces(card);
  if (Array.isArray(faces) && faces.length > 0) return faces[0];
  return card || {};
}

export function getCombinedTypeLine(card) {
  const rootType = getField(card, 'type_line', card?.typeLine || '');
  const faceTypes = Array.isArray(getCardFaces(card)) ? getCardFaces(card).map((face) => getTextValue(face, 'type_line', 'typeLine')) : [];
  return normalizeText([rootType, ...faceTypes].join(' '));
}

export function getCombinedOracleText(card) {
  const rootText = getField(card, 'oracle_text', card?.oracleText || '');
  const faceText = Array.isArray(getCardFaces(card)) ? getCardFaces(card).map((face) => getTextValue(face, 'oracle_text', 'oracleText')) : [];
  return normalizeText([rootText, ...faceText].join(' '));
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function parseFirstNumber(text, fallback) {
  const match = text.match(/\b(\d+)\b/);
  return match ? Number(match[1]) : fallback;
}

function parseWrittenNumber(text, fallback = 1) {
  if (text.includes('one')) return 1;
  if (text.includes('two')) return 2;
  if (text.includes('three')) return 3;
  if (text.includes('four')) return 4;
  return fallback;
}

function getManaValue(card) {
  const face = Array.isArray(getCardFaces(card))
    ? getCardFaces(card).find((cardFace) => cardFace?.cmc !== undefined || cardFace?.mana_value !== undefined || cardFace?.manaValue !== undefined)
    : null;
  const value = card?.cmc ?? card?.mana_value ?? card?.manaValue ?? card?.full_scryfall_data?.cmc ?? card?.full_scryfall_data?.mana_value ?? face?.cmc ?? face?.mana_value ?? face?.manaValue ?? card?.sourceCard?.cmc ?? 1;
  return clampCost(value);
}

function parseNumberToken(value) {
  const normalized = normalizeText(value).trim();
  const numericValue = Number.parseInt(normalized, 10);
  return Number.isFinite(numericValue) ? numericValue : NUMBER_WORDS[normalized] || null;
}

function parseOracleNumber(oracleText, patterns) {
  for (const pattern of patterns) {
    const match = oracleText.match(pattern);
    const parsed = match ? parseNumberToken(match[1]) : null;
    if (parsed !== null) return parsed;
  }
  return null;
}

export function parseStatValue(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const numeric = Number(String(value).trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getCardFaceWithStats(card) {
  if (getField(card, 'power') !== undefined || getField(card, 'toughness') !== undefined) return card;
  const faces = Array.isArray(getCardFaces(card)) ? getCardFaces(card) : [];
  return faces.find((face) => face?.power !== undefined || face?.toughness !== undefined) || faces[0] || card || {};
}

export function getRarityBonus(card) {
  return RARITY_BONUS[normalizeText(card?.rarity)] || 0;
}

export function getColorIdentity(card) {
  const colors = normalizeColors(card);
  return colors.includes('C') && colors.length === 1 ? [] : colors;
}

function getPrimaryColor(card) {
  return getBattlePrimaryColor(card);
}

export function getBattleKeywords(card) {
  const explicitKeywords = getField(card, 'keywords', card?.sourceCard?.keywords || []);
  const oracleText = getCombinedOracleText(card);
  const detectedKeywords = Object.keys(SUPPORTED_KEYWORDS).filter((keyword) => oracleText.includes(keyword));
  return [...new Set([...explicitKeywords, ...detectedKeywords]
    .map((keyword) => SUPPORTED_KEYWORDS[normalizeText(keyword)] || keyword)
    .filter((keyword) => Object.values(SUPPORTED_KEYWORDS).includes(keyword)))];
}

export function getBattleCardType(card) {
  const typeLine = getCombinedTypeLine(card);
  const text = getCombinedOracleText(card);

  if (typeLine.includes('land')) return 'land';
  if (typeLine.includes('creature')) return 'creature';
  if (typeLine.includes('planeswalker')) return 'planeswalker';
  if (
    includesAny(text, [
      'destroy target creature',
      'destroy target nonland permanent',
      'exile target creature',
      'exile target nonland permanent',
      'destroy all creatures',
      'exile all creatures',
    ])
  ) return 'removalSpell';
  if (
    includesAny(text, [
      'return target creature card from your graveyard to the battlefield',
      'return a creature card from your graveyard to the battlefield',
      'return target creature card from your graveyard to your hand',
      'return target card from your graveyard',
      'from your graveyard to the battlefield',
    ])
  ) return 'reanimateSpell';
  if (
    includesAny(text, [
      "return target creature to its owner's hand",
      "return target nonland permanent to its owner's hand",
      'return target spell',
      "put target creature on top of its owner's library",
    ])
  ) return 'bounceSpell';
  if ((text.includes('deals') && text.includes('damage')) || includesAny(text, ['deal ', 'any target', 'each opponent takes'])) return 'damageSpell';
  if ((text.includes('loses') && text.includes('you gain')) || includesAny(text, ['each opponent loses', 'target opponent loses', 'drain'])) return 'drainSpell';
  if (
    includesAny(text, [
      'draw a card',
      'draw two cards',
      'draw three cards',
      'draw cards',
      'investigate',
      'surveil',
      'draw a card, then discard a card',
      'discard a card, then draw a card',
    ])
  ) return 'drawSpell';
  if (includesAny(text, ['gain life', 'you gain', 'gain x life'])) return 'healSpell';
  if (text.includes('create') && (text.includes('token') || matchesAny(text, [/create (a|one|two|three|x)\b/]))) return 'tokenSpell';
  if (includesAny(text, ['amass', 'incubate'])) return 'tokenSpell';
  if (
    includesAny(text, [
      '+1/+1',
      'gets +',
      'put a +1/+1 counter',
      'put one or more +1/+1 counters',
      'counters on target creature',
      'creatures you control get +',
      'target creature you control gets +',
      "double target creature's power",
    ])
  ) return 'buffSpell';
  if (includesAny(text, ['gets -', '-1/-1', 'creatures your opponents control get -', 'target creature gets -', 'weaken'])) return 'debuffSpell';
  if (includesAny(text, ['target player discards', 'each opponent discards', 'discard a card', 'opponent reveals their hand'])) return 'discardSpell';
  if (
    includesAny(text, ['add one mana', 'mana of any color', 'search your library for a basic land', 'put a land card onto the battlefield']) ||
    matchesAny(text, [/\badd\b.*\bmana\b/])
  ) return 'rampSpell';
  if (includesAny(text, ['prevent', 'indestructible', 'protection', 'shield'])) return 'shieldSpell';
  if (typeLine.includes('artifact') && !typeLine.includes('creature')) return 'artifact';
  if (typeLine.includes('enchantment') && !typeLine.includes('creature')) return 'enchantment';
  return 'genericSpell';
}

function describe(effect) {
  if (effect.description) return effect;
  if (effect.type === 'damage') return { ...effect, description: `Deal ${effect.amount || 1} damage` };
  if (effect.type === 'heal') return { ...effect, description: `Heal ${effect.amount || 1} health` };
  if (effect.type === 'draw') return { ...effect, description: `Draw ${effect.amount || 1} card${effect.amount === 1 ? '' : 's'}` };
  if (effect.type === 'buff') return { ...effect, description: `Give a creature +${effect.attackBonus ?? effect.amount ?? 1}/+${effect.healthBonus ?? effect.amount ?? 1}` };
  if (effect.type === 'shield') return { ...effect, description: `Shield a creature for ${effect.amount || 1}` };
  if (effect.type === 'reanimate') return { ...effect, description: 'Return a creature from your graveyard' };
  if (effect.type === 'bounce') return { ...effect, description: 'Return an enemy creature to hand' };
  if (effect.type === 'discard') return { ...effect, description: `Enemy discards ${effect.amount || 1} card` };
  if (effect.type === 'debuff') return { ...effect, description: `Give an enemy creature -${effect.attackPenalty ?? effect.amount ?? 1}/-${effect.healthPenalty ?? effect.amount ?? 1}` };
  if (effect.type === 'removeCreature') return { ...effect, description: 'Destroy an enemy creature' };
  if (effect.type === 'weakenCreature') return { ...effect, description: 'Weaken an enemy creature' };
  if (effect.type === 'createToken') return { ...effect, description: `Create a ${effect.token?.attack || effect.attack || 1}/${effect.token?.health || effect.health || 1} token` };
  if (effect.type === 'drain') return { ...effect, description: `Drain ${effect.amount || 1} health` };
  if (effect.type === 'manaBoost') return { ...effect, description: 'Gain +1 mana this turn' };
  if (effect.type === 'artifactBuff') return { ...effect, description: 'Give a creature +1 attack' };
  if (effect.type === 'teamBuff') return { ...effect, description: 'Give your team +1 health' };
  if (effect.type === 'flex') return { ...effect, description: 'Flexible color magic' };
  return { ...effect, description: 'Generic spell effect' };
}

function capEffectAmount(effectType, amount, cost) {
  const safeAmount = Math.max(1, Math.round(amount || 1));
  if (effectType === 'damage' || effectType === 'drain') return Math.min(cost <= 2 ? 3 : cost <= 4 ? 5 : 7, safeAmount);
  if (effectType === 'draw') return Math.min(cost >= 5 ? 3 : 2, safeAmount);
  if (effectType === 'heal' || effectType === 'shield') return Math.min(cost <= 2 ? 4 : 7, safeAmount);
  if (effectType === 'buff' || effectType === 'debuff' || effectType === 'weakenCreature') return Math.min(cost <= 3 ? 2 : 3, safeAmount);
  return safeAmount;
}

export function applyColorEffectAdjustments(effect, colors, cost = 1) {
  const signature = getColorSignature(colors);
  const profile = getColorEffectProfile(colors);
  const balance = getColorBalanceModifier(colors);
  const adjustedEffect = { ...effect };
  const oldTypeForBonus = adjustedEffect.type === 'removeCreature' ? 'removal' : adjustedEffect.type === 'weakenCreature' ? 'weaken' : adjustedEffect.type === 'createToken' ? 'token' : adjustedEffect.type;
  const spellBonus = profile.spellBonus?.[oldTypeForBonus] || 0;

  if (adjustedEffect.amount !== undefined) {
    adjustedEffect.amount = capEffectAmount(adjustedEffect.type, (adjustedEffect.amount + spellBonus) * balance.effectStrengthModifier, cost);
  }

  if (adjustedEffect.type === 'createToken') {
    const token = adjustedEffect.token || { attack: adjustedEffect.attack || 1, health: adjustedEffect.health || 1, name: 'Summoned Token' };
    const tokenBonus = Math.min(1, profile.spellBonus?.token || 0);
    adjustedEffect.token = {
      ...token,
      attack: Math.min(cost <= 3 ? 2 : 4, Math.max(1, Math.round((token.attack + tokenBonus) * balance.effectStrengthModifier))),
      health: Math.min(cost <= 3 ? 3 : 5, Math.max(1, Math.round((token.health + tokenBonus) * balance.effectStrengthModifier))),
    };
  }

  if (signature.length >= 4 && adjustedEffect.amount !== undefined && adjustedEffect.type !== 'draw') {
    adjustedEffect.amount = Math.max(1, adjustedEffect.amount - 1);
  }

  return describe(adjustedEffect);
}

function getFallbackEffect(colors, cost) {
  const signature = getColorSignature(colors);
  const primaryColor = colors.find((color) => color !== 'C') || 'C';
  if (signature === 'WUBRG') return { amount: Math.max(1, Math.ceil(cost / 3)), targetType: 'flex', type: 'flex' };
  if (primaryColor === 'R') return { amount: 2, targetType: 'enemyAny', type: 'damage' };
  if (primaryColor === 'W') return { amount: 2, targetType: 'self', type: 'heal' };
  if (primaryColor === 'U') return { amount: 1, targetType: 'self', type: 'draw' };
  if (primaryColor === 'B') return { amount: 1, targetType: 'enemyAny', type: 'drain' };
  if (primaryColor === 'G') return { attackBonus: 1, healthBonus: 1, targetType: 'friendlyCreature', type: 'buff' };
  return { amount: 1, targetType: 'enemyAny', type: 'damage' };
}

function getSupportEffect(card, battleType, cost, colors) {
  const text = getCombinedOracleText(card);
  const primaryColor = getPrimaryColor(card);

  if (battleType === 'artifact') {
    if (text.includes('add') && text.includes('mana')) return { amount: 1, targetType: 'self', type: 'manaBoost' };
    if (text.includes('equip') || text.includes('equipped creature')) return { attackBonus: 1, healthBonus: 0, targetType: 'friendlyCreature', type: 'artifactBuff' };
    if (text.includes('draw')) return { amount: 1, targetType: 'self', type: 'draw' };
    return { attackBonus: 1, healthBonus: 0, targetType: 'friendlyCreature', type: 'artifactBuff' };
  }

  if (battleType === 'enchantment') {
    if (text.includes('aura') && text.includes('gets -')) return { amount: 1, attackPenalty: 1, healthPenalty: 1, targetType: 'enemyCreature', type: 'debuff' };
    if (text.includes('+')) return { attackBonus: cost >= 4 ? 2 : 1, healthBonus: cost >= 4 ? 2 : 1, targetType: 'friendlyCreature', type: 'buff' };
    if (text.includes('draw')) return { amount: 1, targetType: 'self', type: 'draw' };
    if (text.includes('life')) return { amount: Math.max(2, Math.ceil(cost / 2)), targetType: 'self', type: 'heal' };
    return { attackBonus: cost >= 5 ? 1 : 0, healthBonus: 1, targetType: 'friendlyCreatures', type: 'teamBuff' };
  }

  if (battleType === 'planeswalker') {
    if (text.includes('destroy') || text.includes('exile')) return { targetType: 'enemyCreature', type: 'removeCreature' };
    if (text.includes('draw')) return { amount: cost >= 5 ? 2 : 1, targetType: 'self', type: 'draw' };
    if (text.includes('create') || text.includes('token')) return { targetType: 'self', token: { attack: 2, health: 2, name: 'Summoned Token' }, type: 'createToken' };
    if (primaryColor === 'R') return { amount: Math.max(3, Math.ceil(cost / 2) + 1), targetType: 'enemyAny', type: 'damage' };
    if (primaryColor === 'W') return { amount: Math.max(3, Math.ceil(cost / 2) + 1), targetType: 'friendlyCreature', type: 'shield' };
    if (primaryColor === 'U') return { amount: cost >= 5 ? 2 : 1, targetType: 'self', type: 'draw' };
    if (primaryColor === 'B') return cost >= 4 ? { targetType: 'enemyCreature', type: 'removeCreature' } : { amount: 2, targetType: 'enemyAny', type: 'drain' };
    if (primaryColor === 'G') return { targetType: 'self', token: { attack: 2, health: 2, name: 'Summoned Token' }, type: 'createToken' };
    return getFallbackEffect(colors, cost);
  }

  return getFallbackEffect(colors, cost);
}

function getSpellEffects(card, battleType, cost) {
  const colors = normalizeColors(card);
  const text = getCombinedOracleText(card);
  const amount = Math.max(2, Math.ceil(cost / 2) + 1);
  const parsedDamage = parseOracleNumber(text, [/deals\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+damage/, /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+damage/]);
  const parsedHeal = parseOracleNumber(text, [/gain\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+life/, /gains\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+life/]);
  const parsedDraw = parseOracleNumber(text, [/draw\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+cards?/]);
  const parsedBuff = text.match(/\+(\d+)\/\+?(\d+)/);
  const parsedDebuff = text.match(/-(\d+)\/-(\d+)/);
  let effect;

  if (battleType === 'damageSpell') effect = { amount: parsedDamage || amount, targetType: 'enemyAny', type: 'damage' };
  else if (battleType === 'removalSpell') effect = cost < 4 ? { amount: Math.max(2, Math.ceil(cost / 2)), targetType: 'enemyCreature', type: 'weakenCreature' } : { targetType: 'enemyCreature', type: 'removeCreature' };
  else if (battleType === 'reanimateSpell') effect = { amount: 1, targetType: 'self', type: 'reanimate' };
  else if (battleType === 'bounceSpell') effect = { amount: 2, targetType: 'enemyCreature', type: 'bounce' };
  else if (battleType === 'drainSpell') effect = { amount: Math.max(1, parseFirstNumber(text, Math.ceil(cost / 2))), targetType: 'enemyPlayer', type: 'drain' };
  else if (battleType === 'drawSpell') effect = { amount: Math.min(cost >= 5 ? 3 : 2, parsedDraw || (text.includes('two') ? 2 : text.includes('three') && cost >= 5 ? 3 : 1)), targetType: 'self', type: 'draw' };
  else if (battleType === 'healSpell') effect = { amount: parsedHeal || amount, targetType: 'self', type: 'heal' };
  else if (battleType === 'buffSpell') {
    effect = {
      attackBonus: parsedBuff ? Number(parsedBuff[1]) : cost >= 4 ? 2 : 1,
      healthBonus: parsedBuff ? Number(parsedBuff[2]) : cost >= 4 ? 2 : 1,
      targetType: text.includes('creatures you control') ? 'friendlyCreatures' : 'friendlyCreature',
      type: text.includes('creatures you control') ? 'teamBuff' : 'buff',
    };
  }
  else if (battleType === 'debuffSpell') {
    effect = {
      amount: parsedDebuff ? Math.max(Number(parsedDebuff[1]), Number(parsedDebuff[2])) : 1,
      attackPenalty: parsedDebuff ? Number(parsedDebuff[1]) : 1,
      healthPenalty: parsedDebuff ? Number(parsedDebuff[2]) : 1,
      targetType: 'enemyCreature',
      type: 'debuff',
    };
  }
  else if (battleType === 'tokenSpell') {
    const tokenSize = Math.max(1, Math.floor(cost / 2));
    const tokenCount = Math.min(cost >= 5 ? 3 : 2, parseWrittenNumber(text, parseFirstNumber(text, 1)));
    effect = { amount: tokenCount, targetType: 'self', token: { attack: tokenSize, health: tokenSize, name: 'Summoned Token' }, type: 'createToken' };
  } else if (battleType === 'shieldSpell') effect = { amount: cost >= 4 ? 2 : 1, targetType: 'friendlyCreature', type: 'shield' };
  else if (battleType === 'discardSpell') effect = { amount: 1, targetType: 'enemy', type: 'discard' };
  else if (battleType === 'rampSpell') effect = { amount: 1, targetType: 'self', type: 'manaBoost' };
  else if (['artifact', 'enchantment', 'planeswalker'].includes(battleType)) effect = getSupportEffect(card, battleType, cost, colors);
  else effect = getFallbackEffect(colors, cost);

  return [applyColorEffectAdjustments(effect, colors, cost)];
}

export function applyColorStatAdjustments(battleCard) {
  if (battleCard.type !== 'creature') return battleCard;
  const colors = normalizeColors(battleCard);
  const signature = getColorSignature(colors);
  const profile = getColorEffectProfile(colors);
  const balance = getColorBalanceModifier(colors);
  const colorCount = signature === 'C' ? 0 : signature.length;
  const maxPositiveBonus = colorCount >= 4 ? 0 : 1;
  let attackAdjustment = profile.creatureBonus?.attack || 0;
  let healthAdjustment = profile.creatureBonus?.health || 0;

  if (signature.includes('G') && battleCard.cost >= 5 && colorCount <= 2) attackAdjustment += 1;
  const positiveBonus = Math.max(0, attackAdjustment) + Math.max(0, healthAdjustment);
  if (positiveBonus > maxPositiveBonus) {
    const overflow = positiveBonus - maxPositiveBonus;
    if (attackAdjustment > 0 && attackAdjustment >= healthAdjustment) attackAdjustment = Math.max(0, attackAdjustment - overflow);
    else healthAdjustment = Math.max(0, healthAdjustment - overflow);
  }
  if (!balance.statModifier) {
    attackAdjustment = Math.min(0, attackAdjustment);
    healthAdjustment = Math.min(0, healthAdjustment);
  }

  const minAttack = battleCard.keywords?.includes('Defender') ? 0 : 1;
  return {
    ...battleCard,
    attack: Math.max(minAttack, battleCard.attack + attackAdjustment),
    health: Math.max(1, battleCard.health + healthAdjustment),
    maxHealth: Math.max(1, battleCard.maxHealth + healthAdjustment),
  };
}

function getImageUrl(card) {
  return card?.imageUrl || card?.image || card?.image_uris?.large || card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.large || card?.card_faces?.[0]?.image_uris?.normal || '';
}

function getDisplayType(type) {
  return {
    artifact: 'Artifact',
    bounceSpell: 'Bounce',
    buffSpell: 'Buff Spell',
    creature: 'Creature',
    damageSpell: 'Damage Spell',
    debuffSpell: 'Debuff',
    discardSpell: 'Discard',
    drainSpell: 'Drain',
    drawSpell: 'Draw Spell',
    enchantment: 'Enchantment',
    genericSpell: 'Generic Spell',
    healSpell: 'Heal Spell',
    planeswalker: 'Planeswalker',
    rampSpell: 'Ramp',
    reanimateSpell: 'Reanimate',
    removalSpell: 'Removal',
    shieldSpell: 'Shield Spell',
    tokenSpell: 'Token Spell',
  }[type] || 'Generic Spell';
}

export function getBattleCardEffectSummary(battleCard) {
  if (battleCard?.type === 'creature') return `${battleCard.attack}/${battleCard.health} Creature`;
  if (!battleCard?.effects?.length) return 'Generic spell';
  return battleCard.effects.map((effect) => effect.description || describe(effect).description).join(', ');
}

export function mapCollectionCardToBattleCard(card) {
  const initialCard = { ...(card || {}) };
  const override = getBattleCardOverride(initialCard);
  const sourceCard = { ...initialCard, ...(override?.cardPatch || {}) };
  const mainFace = getMainFace(sourceCard);
  const statsFace = getCardFaceWithStats(sourceCard);
  const type = override?.type || getBattleCardType(sourceCard);
  const colors = normalizeColors(sourceCard);
  const colorSignature = getColorSignature(colors);
  const colorBalance = getColorBalanceModifier(colors);
  const cost = clampCost(getManaValue(sourceCard) + colorBalance.costModifier);
  const originalPower = statsFace?.power ?? mainFace.power ?? sourceCard.full_scryfall_data?.power ?? null;
  const originalToughness = statsFace?.toughness ?? mainFace.toughness ?? sourceCard.full_scryfall_data?.toughness ?? null;
  const fallbackAttack = Math.max(1, Math.ceil(cost / 2));
  const fallbackHealth = Math.max(1, Math.ceil(cost / 2) + 1);
  const rarityBonus = getRarityBonus(sourceCard);
  const keywords = getBattleKeywords(sourceCard);
  let attack = 0;
  let health = 0;

  if (type === 'creature') {
    attack = parseStatValue(originalPower, fallbackAttack);
    health = parseStatValue(originalToughness, fallbackHealth);
    if (rarityBonus === 1) attack += 1;
    if (rarityBonus >= 2) {
      attack += 1;
      health += 1;
    }
    if (keywords.includes('Defender')) health += 1;
  }

  const battleCard = {
    attack,
    battleId: `${sourceCard.userCardId || sourceCard.collectionId || sourceCard.id || sourceCard.name}-battle`,
    colorIdentity: getColorIdentity(sourceCard),
    colorName: getColorCombinationName(colors),
    colorProfile: getColorEffectProfile(colors),
    colorSignature,
    colors,
    colorStrategy: getColorStrategy(colors),
    cost,
    displayType: getDisplayType(type),
    effects: override?.effects || (type === 'creature' || type === 'land' ? [] : getSpellEffects(sourceCard, type, cost)),
    foilTreatment: sourceCard.foilTreatment || null,
    health,
    imageUrl: getImageUrl(sourceCard),
    isFoil: Boolean(sourceCard.isFoil),
    keywords,
    maxHealth: health,
    name: sourceCard.name || mainFace?.name || statsFace?.name || 'Unknown Card',
    oracleText: getCombinedOracleText(sourceCard) || getTextValue(mainFace, 'oracle_text', 'oracleText'),
    originalPower,
    originalToughness,
    primaryColor: getPrimaryColor(sourceCard),
    rarity: sourceCard.rarity || 'common',
    scryfallId: sourceCard.id || sourceCard.scryfall_id || null,
    setCode: sourceCard.set || sourceCard.set_code || null,
    setName: sourceCard.set_name || sourceCard.setName || null,
    sourceCard,
    type,
    userCardId: sourceCard.userCardId || sourceCard.collectionId || null,
  };

  if (import.meta.env?.DEV && type === 'genericSpell') {
    console.warn('Generic spell fallback:', {
      name: sourceCard.name,
      normalized_name: normalizeArenaCardName(sourceCard.name),
      oracle_text: getCombinedOracleText(sourceCard),
      type_line: getCombinedTypeLine(sourceCard),
    });
  }

  return applyColorStatAdjustments(battleCard);
}

export function mapCollectionToBattleCards(collection) {
  return (collection || []).map(mapCollectionCardToBattleCard).filter((card) => card.type !== 'land');
}

export function printGenericBattleCards(collection = []) {
  const genericCards = (collection || [])
    .map((card) => ({
      name: card?.name,
      normalized_name: normalizeArenaCardName(card?.name),
      oracle_text: getCombinedOracleText(card),
      type: getBattleCardType(card),
      type_line: getCombinedTypeLine(card),
    }))
    .filter((card) => card.type === 'genericSpell');

  console.table(genericCards);
  return genericCards;
}
