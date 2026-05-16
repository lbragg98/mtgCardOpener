// Converts real Scryfall collection cards into simplified Binder Battle cards.
import {
  getColorBalanceModifier,
  getColorCombinationName,
  getColorEffectProfile,
  getColorSignature,
  getColorStrategy,
  getPrimaryColor as getBattlePrimaryColor,
  normalizeColors,
} from './battleColors.js';
import { getBattleCardOverride } from './battleCardOverrides.js';

export const INCLUDE_LANDS_IN_BATTLE = true;

const RARITY_BONUS = { common: 0, uncommon: 1, rare: 2, mythic: 3 };
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, twice: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const SUPPORTED_KEYWORDS = {
  deathtouch: 'Deathtouch',
  defender: 'Defender',
  'double strike': 'Double strike',
  'first strike': 'First strike',
  flying: 'Flying',
  haste: 'Haste',
  hexproof: 'Hexproof',
  indestructible: 'Indestructible',
  lifelink: 'Lifelink',
  menace: 'Menace',
  reach: 'Reach',
  trample: 'Trample',
  vigilance: 'Vigilance',
  ward: 'Ward',
};

const ROLE_LABELS = {
  artifactUtility: 'Artifact Utility',
  attackerCreature: 'Attacker',
  auraBuff: 'Aura Buff',
  battleSiege: 'Battle Siege',
  buffSpell: 'Buff Spell',
  colorFallbackSpell: 'Color Spell',
  controlSpell: 'Control Spell',
  damageSpell: 'Damage Spell',
  debuffSpell: 'Debuff Spell',
  defensiveCreature: 'Defender',
  drawSpell: 'Draw Spell',
  enchantmentBuff: 'Enchantment Buff',
  equipmentBuff: 'Equipment Buff',
  evasiveCreature: 'Evasive Creature',
  healSpell: 'Heal Spell',
  landResource: 'Resource Land',
  planeswalkerSupport: 'Planeswalker',
  rampSpell: 'Ramp Spell',
  removalSpell: 'Removal Spell',
  reviveSpell: 'Revive Spell',
  tokenSpell: 'Token Spell',
  utilityCreature: 'Utility Creature',
};

function clamp(value, min, max) {
  const number = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
}

function clampCost(value) {
  return clamp(Math.ceil(Number(value || 1)), 1, 10);
}

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getField(card, snakeKey, camelKey = snakeKey, fallback = undefined) {
  return card?.[snakeKey] ?? card?.[camelKey] ?? card?.sourceCard?.[snakeKey] ?? card?.sourceCard?.[camelKey] ?? card?.full_scryfall_data?.[snakeKey] ?? card?.full_scryfall_data?.[camelKey] ?? fallback;
}

function getFaceField(face, snakeKey, camelKey = snakeKey) {
  return face?.[snakeKey] ?? face?.[camelKey] ?? '';
}

export function getAllCardFaces(card) {
  const faces = getField(card, 'card_faces', 'cardFaces', []);
  return Array.isArray(faces) ? faces.filter(Boolean) : [];
}

export function getPrimaryCardFace(card) {
  if (!card) return {};
  if (getField(card, 'type_line', 'typeLine') || getField(card, 'oracle_text', 'oracleText') || getField(card, 'power') || getField(card, 'toughness')) {
    return card;
  }
  return getAllCardFaces(card)[0] || card || {};
}

export const getMainFace = getPrimaryCardFace;

export function getCombinedOracleText(card) {
  const rootText = getField(card, 'oracle_text', 'oracleText', '');
  const faceText = getAllCardFaces(card).map((face) => getFaceField(face, 'oracle_text', 'oracleText'));
  return normalizeText([rootText, ...faceText].filter(Boolean).join(' '));
}

export function getCombinedTypeLine(card) {
  const rootType = getField(card, 'type_line', 'typeLine', '');
  const faceTypes = getAllCardFaces(card).map((face) => getFaceField(face, 'type_line', 'typeLine'));
  return normalizeText([rootType, ...faceTypes].filter(Boolean).join(' '));
}

export function getSearchableCardText(card) {
  const keywords = getField(card, 'keywords', 'keywords', []);
  return normalizeText([
    getField(card, 'name', 'name', ''),
    getCombinedTypeLine(card),
    getCombinedOracleText(card),
    Array.isArray(keywords) ? keywords.join(' ') : keywords,
  ].join(' '));
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function hasAll(text, terms) {
  return terms.every((term) => text.includes(term));
}

function parseNumberToken(value) {
  const normalized = normalizeText(value);
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) ? numeric : NUMBER_WORDS[normalized] || null;
}

function parseOracleNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match ? parseNumberToken(match[1]) : null;
    if (value !== null) return value;
  }
  return null;
}

function getManaValue(card) {
  const faces = getAllCardFaces(card);
  const faceWithCost = faces.find((face) => getFaceField(face, 'cmc') !== '' || getFaceField(face, 'mana_value', 'manaValue') !== '');
  return clampCost(
    getField(card, 'cmc') ??
    getField(card, 'mana_value', 'manaValue') ??
    faceWithCost?.cmc ??
    faceWithCost?.mana_value ??
    faceWithCost?.manaValue ??
    1,
  );
}

export function getRarityBonus(card) {
  return RARITY_BONUS[normalizeText(getField(card, 'rarity', 'rarity', 'common'))] || 0;
}

export function getColorIdentity(card) {
  const colors = normalizeColors(card);
  return colors.includes('C') && colors.length === 1 ? [] : colors;
}

function getPrimaryColor(card) {
  return getBattlePrimaryColor(card);
}

export function getBattleKeywords(card) {
  const explicitKeywords = getField(card, 'keywords', 'keywords', []);
  const text = getSearchableCardText(card);
  const detectedKeywords = Object.keys(SUPPORTED_KEYWORDS).filter((keyword) => text.includes(keyword));
  return [...new Set([...(Array.isArray(explicitKeywords) ? explicitKeywords : []), ...detectedKeywords]
    .map((keyword) => SUPPORTED_KEYWORDS[normalizeText(keyword)] || keyword)
    .filter((keyword) => Object.values(SUPPORTED_KEYWORDS).includes(keyword)))];
}

export function detectBattleCardCategory(card) {
  const typeLine = getCombinedTypeLine(card);
  const text = getCombinedOracleText(card);

  if (typeLine.includes('creature')) return 'creature';
  if (typeLine.includes('planeswalker')) return 'planeswalker';
  if (typeLine.includes('equipment')) return 'equipment';
  if (typeLine.includes('vehicle')) return 'vehicle';
  if (typeLine.includes('artifact')) return 'artifact';
  if (typeLine.includes('aura')) return 'aura';
  if (typeLine.includes('enchantment')) return 'enchantment';
  if (typeLine.includes('instant')) return 'instant';
  if (typeLine.includes('sorcery')) return 'sorcery';
  if (typeLine.includes('battle')) return 'battle';
  if (typeLine.includes('land')) return 'land';
  if (text.includes('create') && text.includes('token')) return 'tokenMaker';
  return 'unknown';
}

function addTag(tags, tag) {
  tags.add(tag);
}

export function detectEffectTags(card) {
  const text = getCombinedOracleText(card);
  const searchable = getSearchableCardText(card);
  const tags = new Set();

  if (
    (text.includes('deals') && text.includes('damage')) ||
    (text.includes('damage') && includesAny(text, ['any target', 'target creature', 'target player', 'each opponent']))
  ) addTag(tags, 'directDamage');
  if (hasAll(text, ['gain', 'life']) || text.includes('you gain')) addTag(tags, 'heal');
  if (hasAll(text, ['loses', 'life']) && hasAll(text, ['gain', 'life'])) addTag(tags, 'drain');
  if (includesAny(text, ['draw a card', 'draw two cards', 'draw three cards', 'draw cards', 'draw x cards'])) addTag(tags, 'draw');
  if (text.includes('draw') && text.includes('discard')) addTag(tags, 'loot');
  if (includesAny(text, ['destroy target creature', 'destroy target'])) addTag(tags, 'destroyCreature');
  if (includesAny(text, ['exile target creature', 'exile target'])) addTag(tags, 'exileCreature');
  if (includesAny(text, ['return target creature', 'return target nonland', 'return target permanent'])) addTag(tags, 'bounce');
  if (includesAny(text, ['+1/+1', 'gets +', 'put a +1/+1 counter', 'counters on target creature'])) addTag(tags, 'buff');
  if (includesAny(text, ['creatures you control get', 'creatures you control gain'])) addTag(tags, 'teamBuff');
  if (includesAny(text, ['gets -', '-1/-1', 'put a -1/-1 counter'])) addTag(tags, 'debuff');
  if ((text.includes('create') && text.includes('token')) || includesAny(text, ['create a', 'create two', 'create x', 'amass', 'incubate'])) addTag(tags, 'createToken');
  if (includesAny(text, ['add ', 'search your library for a basic land', 'put a land card', 'treasure token']) || Array.isArray(getField(card, 'produced_mana', 'producedMana', [])) && getField(card, 'produced_mana', 'producedMana', []).length) addTag(tags, 'ramp');
  if (includesAny(text, ['return target creature card from your graveyard', 'return from your graveyard', 'from your graveyard to the battlefield'])) addTag(tags, 'revive');
  if (includesAny(text, ['mill', 'puts the top']) && text.includes('graveyard')) addTag(tags, 'mill');
  if (text.includes('counter target spell')) addTag(tags, 'counterSpell');
  if (includesAny(text, ['tap target', "doesn't untap", 'stun counter'])) addTag(tags, 'tapStun');
  if (includesAny(text, ['prevent', 'indestructible', 'hexproof', 'protection from', 'ward'])) addTag(tags, 'shield');
  if (text.includes('additional combat')) addTag(tags, 'extraCombat');
  if (includesAny(text, ['fights target', 'fight'])) addTag(tags, 'fight');
  if (searchable.includes('scry')) addTag(tags, 'scry');
  if (searchable.includes('surveil')) addTag(tags, 'surveil');

  return [...tags];
}

function hasTag(tags, ...wantedTags) {
  return wantedTags.some((tag) => tags.includes(tag));
}

function getColorFallbackRole(card, effectTags = detectEffectTags(card)) {
  const colors = normalizeColors(card).filter((color) => color !== 'C');
  const ordered = colors.length ? colors : ['C'];

  if (hasTag(effectTags, 'directDamage')) return 'damageSpell';
  if (hasTag(effectTags, 'destroyCreature', 'exileCreature')) return 'removalSpell';
  if (hasTag(effectTags, 'draw', 'loot', 'scry', 'surveil')) return 'drawSpell';
  if (hasTag(effectTags, 'createToken')) return 'tokenSpell';
  if (hasTag(effectTags, 'buff', 'teamBuff', 'shield')) return 'buffSpell';
  if (hasTag(effectTags, 'heal', 'drain')) return 'healSpell';
  if (hasTag(effectTags, 'ramp')) return 'rampSpell';
  if (hasTag(effectTags, 'counterSpell', 'tapStun', 'bounce')) return 'controlSpell';

  if (ordered.includes('R')) return 'damageSpell';
  if (ordered.includes('B')) return 'removalSpell';
  if (ordered.includes('G')) return 'tokenSpell';
  if (ordered.includes('U')) return 'drawSpell';
  if (ordered.includes('W')) return 'healSpell';
  return detectBattleCardCategory(card) === 'artifact' ? 'artifactUtility' : 'colorFallbackSpell';
}

export function determineBattleRole(card) {
  const category = detectBattleCardCategory(card);
  const effectTags = detectEffectTags(card);
  const keywords = getBattleKeywords(card);
  const { attack, health } = parsePowerToughness(card);
  let role = 'colorFallbackSpell';
  let confidence = 'medium';
  let reason = `${category} inferred from type line`;

  if (category === 'creature' || category === 'vehicle') {
    if (hasTag(effectTags, 'draw', 'heal', 'createToken', 'buff', 'teamBuff', 'destroyCreature', 'exileCreature', 'directDamage', 'ramp')) {
      role = 'utilityCreature';
      reason = 'creature has reusable utility text';
    } else if (keywords.some((keyword) => ['Flying', 'Menace', 'Trample'].includes(keyword))) {
      role = 'evasiveCreature';
      reason = 'creature has evasion or pressure keyword';
    } else if (keywords.includes('Haste') || attack >= health) {
      role = 'attackerCreature';
      reason = 'creature leans aggressive';
    } else if (health >= attack + 2 || keywords.includes('Defender')) {
      role = 'defensiveCreature';
      reason = 'creature has high toughness or defender';
    } else {
      role = 'attackerCreature';
      reason = 'creature defaulted to attacker';
    }
    return { category, confidence: 'high', effectTags, reason, role };
  }

  if (category === 'planeswalker') return { category, confidence: 'high', effectTags, reason: 'planeswalker support permanent', role: 'planeswalkerSupport' };
  if (category === 'equipment') return { category, confidence: 'high', effectTags, reason: 'equipment maps to creature buff', role: 'equipmentBuff' };
  if (category === 'aura') {
    if (hasTag(effectTags, 'debuff', 'destroyCreature', 'exileCreature', 'tapStun')) return { category, confidence: 'high', effectTags, reason: 'aura hinders enemy creature', role: 'debuffSpell' };
    return { category, confidence: 'high', effectTags, reason: 'aura maps to creature buff', role: 'auraBuff' };
  }
  if (category === 'enchantment') {
    if (hasTag(effectTags, 'teamBuff', 'buff', 'shield')) role = 'enchantmentBuff';
    else if (hasTag(effectTags, 'draw', 'loot', 'scry', 'surveil')) role = 'drawSpell';
    else if (hasTag(effectTags, 'createToken')) role = 'tokenSpell';
    else if (hasTag(effectTags, 'drain', 'heal')) role = 'healSpell';
    else role = getColorFallbackRole(card, effectTags) === 'colorFallbackSpell' ? 'enchantmentBuff' : getColorFallbackRole(card, effectTags);
    return { category, confidence: hasTag(effectTags, 'teamBuff', 'buff', 'draw', 'createToken', 'drain', 'heal') ? 'high' : 'medium', effectTags, reason: 'enchantment effect mapped from text/color', role };
  }
  if (category === 'artifact') {
    if (hasTag(effectTags, 'ramp')) role = 'rampSpell';
    else if (hasTag(effectTags, 'draw', 'loot')) role = 'drawSpell';
    else if (hasTag(effectTags, 'directDamage')) role = 'damageSpell';
    else role = 'artifactUtility';
    return { category, confidence: role === 'artifactUtility' ? 'medium' : 'high', effectTags, reason: 'artifact utility mapped from text/color', role };
  }
  if (category === 'instant' || category === 'sorcery' || category === 'tokenMaker') {
    if (hasTag(effectTags, 'destroyCreature', 'exileCreature')) role = 'removalSpell';
    else if (hasTag(effectTags, 'directDamage', 'fight')) role = 'damageSpell';
    else if (hasTag(effectTags, 'draw', 'loot', 'scry', 'surveil')) role = 'drawSpell';
    else if (hasTag(effectTags, 'drain', 'heal')) role = 'healSpell';
    else if (hasTag(effectTags, 'createToken')) role = 'tokenSpell';
    else if (hasTag(effectTags, 'buff', 'teamBuff', 'shield')) role = 'buffSpell';
    else if (hasTag(effectTags, 'debuff')) role = 'debuffSpell';
    else if (hasTag(effectTags, 'ramp')) role = 'rampSpell';
    else if (hasTag(effectTags, 'counterSpell', 'tapStun', 'bounce')) role = 'controlSpell';
    else if (hasTag(effectTags, 'revive')) role = 'reviveSpell';
    else {
      role = getColorFallbackRole(card, effectTags);
      confidence = 'low';
      reason = 'spell fell back to color identity';
    }
    return { category, confidence, effectTags, reason, role };
  }
  if (category === 'battle') return { category, confidence: 'medium', effectTags, reason: 'battle maps to siege support', role: 'battleSiege' };
  if (category === 'land') return { category, confidence: 'medium', effectTags, reason: 'land maps to simple resource card', role: 'landResource' };

  role = getColorFallbackRole(card, effectTags);
  return { category, confidence: 'low', effectTags, reason: 'unknown card used color fallback', role };
}

export function parseStatValue(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  if (!/^-?\d+$/.test(normalized)) return fallback;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getCardFaceWithStats(card) {
  if (getField(card, 'power') !== undefined || getField(card, 'toughness') !== undefined) return card;
  const faces = getAllCardFaces(card);
  return faces.find((face) => face?.power !== undefined || face?.toughness !== undefined) || faces[0] || card || {};
}

export function parsePowerToughness(card) {
  const cost = getManaValue(card);
  const statsFace = getCardFaceWithStats(card);
  const originalPower = getField(card, 'power') ?? statsFace?.power ?? null;
  const originalToughness = getField(card, 'toughness') ?? statsFace?.toughness ?? null;
  const fallbackAttack = Math.max(1, Math.ceil(cost / 2));
  const fallbackHealth = Math.max(1, Math.ceil(cost / 2) + 1);
  const keywords = getBattleKeywords(card);
  let attack = parseStatValue(originalPower, fallbackAttack);
  let health = parseStatValue(originalToughness, fallbackHealth);

  if (keywords.includes('Defender')) health += 1;

  return {
    attack: clamp(attack, keywords.includes('Defender') ? 0 : 1, 12),
    health: clamp(health, 1, 14),
    originalPower,
    originalToughness,
  };
}

function calculateEffectStrength(card, role) {
  const text = getCombinedOracleText(card);
  const cost = getManaValue(card);
  const rarityBonus = getRarityBonus(card);
  const parsedDamage = parseOracleNumber(text, [/deals\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+damage/, /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+damage/]);
  const parsedHeal = parseOracleNumber(text, [/gain\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+life/, /gains\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+life/]);
  const parsedDraw = parseOracleNumber(text, [/draw\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+cards?/]);
  const parsedBuff = text.match(/\+(\d+)\/\+?(\d+)/);
  const tokenCount = text.includes('three') ? 3 : text.includes('two') || text.includes('twice') ? 2 : 1;

  if (role === 'damageSpell') return { amount: parsedDamage || Math.max(1, Math.ceil(cost / 2) + rarityBonus) };
  if (role === 'healSpell') return { amount: parsedHeal || Math.max(2, cost + rarityBonus) };
  if (role === 'drawSpell') return { amount: Math.min(3, parsedDraw || (text.includes('two') ? 2 : text.includes('three') ? 3 : 1)) };
  if (['buffSpell', 'equipmentBuff', 'enchantmentBuff', 'auraBuff'].includes(role)) return { attackBonus: parsedBuff ? Number(parsedBuff[1]) : Math.max(1, Math.ceil(cost / 3)), healthBonus: parsedBuff ? Number(parsedBuff[2]) : Math.max(1, Math.ceil(cost / 3)) };
  if (role === 'debuffSpell') return { attackPenalty: 1 + Math.min(2, rarityBonus), healthPenalty: 1 + Math.min(2, rarityBonus) };
  if (role === 'removalSpell') return cost >= 3 || rarityBonus >= 2 ? { destroy: true } : { amount: cost + rarityBonus };
  if (role === 'tokenSpell') return { amount: Math.min(3, tokenCount), token: { attack: Math.max(1, Math.floor(cost / 2)), health: Math.max(1, Math.ceil(cost / 2)), name: 'Summoned Token' } };
  if (role === 'rampSpell' || role === 'landResource') return { amount: 1 };
  return { amount: Math.max(1, Math.ceil(cost / 2) + Math.min(1, rarityBonus)) };
}

function describe(effect) {
  if (effect.description) return effect;
  if (effect.type === 'damage') return { ...effect, description: `Deal ${effect.amount || 1} damage` };
  if (effect.type === 'heal') return { ...effect, description: `Heal ${effect.amount || 1}` };
  if (effect.type === 'draw') return { ...effect, description: `Draw ${effect.amount || 1} card${effect.amount === 1 ? '' : 's'}` };
  if (effect.type === 'buff') return { ...effect, description: `Give a creature +${effect.attackBonus ?? effect.amount ?? 1}/+${effect.healthBonus ?? effect.amount ?? 1}` };
  if (effect.type === 'shield') return { ...effect, description: `Shield a creature for ${effect.amount || 1}` };
  if (effect.type === 'reanimate') return { ...effect, description: 'Return a creature from your graveyard' };
  if (effect.type === 'bounce') return { ...effect, description: 'Return an enemy creature to hand' };
  if (effect.type === 'discard') return { ...effect, description: `Enemy discards ${effect.amount || 1} card` };
  if (effect.type === 'debuff') return { ...effect, description: `Give an enemy creature -${effect.attackPenalty ?? effect.amount ?? 1}/-${effect.healthPenalty ?? effect.amount ?? 1}` };
  if (effect.type === 'removeCreature') return { ...effect, description: 'Destroy an enemy creature' };
  if (effect.type === 'weakenCreature') return { ...effect, description: `Deal ${effect.amount || 1} damage to a creature` };
  if (effect.type === 'createToken') return { ...effect, description: `Create ${effect.amount || 1} token${effect.amount === 1 ? '' : 's'}` };
  if (effect.type === 'drain') return { ...effect, description: `Drain ${effect.amount || 1}` };
  if (effect.type === 'manaBoost') return { ...effect, description: 'Gain 1 mana' };
  if (effect.type === 'artifactBuff') return { ...effect, description: `Utility: +${effect.attackBonus ?? 1}/+${effect.healthBonus ?? 0}` };
  if (effect.type === 'teamBuff') return { ...effect, description: 'Give your team +1 health' };
  if (effect.type === 'tapStun') return { ...effect, description: 'Stun an enemy creature' };
  if (effect.type === 'flex') return { ...effect, description: 'Flexible color magic' };
  return { ...effect, description: 'Useful battle effect' };
}

function capEffectAmount(effectType, amount, cost) {
  const safeAmount = Math.max(1, Math.round(amount || 1));
  if (effectType === 'damage' || effectType === 'drain') return Math.min(cost <= 2 ? 3 : cost <= 4 ? 5 : 7, safeAmount);
  if (effectType === 'draw') return Math.min(cost >= 5 ? 3 : 2, safeAmount);
  if (effectType === 'heal' || effectType === 'shield') return Math.min(cost <= 2 ? 4 : 8, safeAmount);
  if (effectType === 'buff' || effectType === 'debuff' || effectType === 'weakenCreature') return Math.min(cost <= 3 ? 2 : 4, safeAmount);
  return safeAmount;
}

export function applyColorEffectAdjustments(effect, colors, cost = 1) {
  const profile = getColorEffectProfile(colors);
  const balance = getColorBalanceModifier(colors);
  const adjustedEffect = { ...effect };
  const bonusKey = adjustedEffect.type === 'removeCreature' ? 'removal' : adjustedEffect.type === 'createToken' ? 'token' : adjustedEffect.type;
  const spellBonus = profile.spellBonus?.[bonusKey] || 0;

  if (adjustedEffect.amount !== undefined) {
    adjustedEffect.amount = capEffectAmount(adjustedEffect.type, (adjustedEffect.amount + spellBonus) * balance.effectStrengthModifier, cost);
  }

  if (adjustedEffect.type === 'createToken') {
    const token = adjustedEffect.token || { attack: 1, health: 1, name: 'Summoned Token' };
    adjustedEffect.token = {
      ...token,
      attack: clamp(Math.round(token.attack * balance.effectStrengthModifier), 1, cost <= 3 ? 2 : 4),
      health: clamp(Math.round(token.health * balance.effectStrengthModifier), 1, cost <= 3 ? 3 : 5),
    };
  }

  return describe(adjustedEffect);
}

function getEffectsForRole(card, role, cost, colors) {
  const strength = calculateEffectStrength(card, role);
  const effectTags = detectEffectTags(card);
  let effect;

  if (role === 'damageSpell') effect = { amount: strength.amount, targetType: 'enemyAny', type: 'damage' };
  else if (role === 'removalSpell') effect = strength.destroy ? { targetType: 'enemyCreature', type: 'removeCreature' } : { amount: strength.amount, targetType: 'enemyCreature', type: 'weakenCreature' };
  else if (role === 'healSpell') effect = hasTag(effectTags, 'drain') ? { amount: Math.max(1, Math.ceil(strength.amount / 2)), targetType: 'enemyAny', type: 'drain' } : { amount: strength.amount, targetType: 'self', type: 'heal' };
  else if (role === 'drawSpell') effect = { amount: strength.amount, targetType: 'self', type: 'draw' };
  else if (['buffSpell', 'auraBuff', 'equipmentBuff'].includes(role)) effect = { attackBonus: strength.attackBonus, healthBonus: strength.healthBonus, targetType: 'friendlyCreature', type: role === 'equipmentBuff' ? 'artifactBuff' : 'buff' };
  else if (role === 'enchantmentBuff') effect = { attackBonus: Math.max(0, strength.attackBonus - 1), healthBonus: strength.healthBonus, targetType: 'friendlyCreatures', type: 'teamBuff' };
  else if (role === 'debuffSpell') effect = { attackPenalty: strength.attackPenalty, healthPenalty: strength.healthPenalty, targetType: 'enemyCreature', type: 'debuff' };
  else if (role === 'tokenSpell') effect = { amount: strength.amount, targetType: 'self', token: strength.token, type: 'createToken' };
  else if (role === 'rampSpell' || role === 'landResource') effect = { amount: 1, targetType: 'self', type: 'manaBoost' };
  else if (role === 'controlSpell') effect = hasTag(effectTags, 'bounce') ? { targetType: 'enemyCreature', type: 'bounce' } : { amount: 1, targetType: 'enemyCreature', type: 'tapStun' };
  else if (role === 'reviveSpell') effect = { amount: 1, targetType: 'self', type: 'reanimate' };
  else if (role === 'planeswalkerSupport') {
    const fallbackRole = getColorFallbackRole(card, effectTags);
    effect = fallbackRole === role || fallbackRole === 'colorFallbackSpell'
      ? { amount: 1, targetType: 'self', type: 'draw' }
      : getEffectsForRole(card, fallbackRole, cost, colors)[0] || { amount: 1, targetType: 'self', type: 'draw' };
  }
  else if (role === 'artifactUtility') effect = { amount: 1, targetType: colors.includes('R') ? 'enemyAny' : 'self', type: colors.includes('R') ? 'damage' : 'draw' };
  else if (role === 'battleSiege') effect = { amount: Math.max(1, Math.ceil(cost / 2)), targetType: 'enemyAny', type: 'damage' };
  else {
    const fallbackRole = getColorFallbackRole(card, effectTags);
    effect = fallbackRole === role || fallbackRole === 'colorFallbackSpell'
      ? { amount: Math.max(1, Math.ceil(cost / 2)), targetType: 'enemyAny', type: 'damage' }
      : getEffectsForRole(card, fallbackRole, cost, colors)[0] || { amount: 1, targetType: 'enemyAny', type: 'damage' };
  }

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
    attack: clamp(battleCard.attack + attackAdjustment, minAttack, 12),
    health: clamp(battleCard.health + healthAdjustment, 1, 14),
    maxHealth: clamp(battleCard.maxHealth + healthAdjustment, 1, 14),
  };
}

function getImageUrl(card) {
  const faces = getAllCardFaces(card);
  return card?.imageUrl || card?.image || card?.image_uris?.large || card?.image_uris?.normal || card?.full_scryfall_data?.image_uris?.large || card?.full_scryfall_data?.image_uris?.normal || faces[0]?.image_uris?.large || faces[0]?.image_uris?.normal || '';
}

function getDisplayType(role, category) {
  return ROLE_LABELS[role] || ROLE_LABELS[getColorFallbackRole({ colors: [category] })] || 'Battle Card';
}

export function getBattleCardType(card) {
  return determineBattleRole(card).role;
}

export function getBattleCardSummary(battleCard) {
  const role = battleCard?.role || battleCard?.mapping?.role || battleCard?.type;
  const effects = battleCard?.effects || [];
  const effect = effects[0] || {};

  if (battleCard?.type === 'creature') {
    if (role === 'evasiveCreature') return `${battleCard.keywords?.find((keyword) => ['Flying', 'Menace', 'Trample'].includes(keyword)) || 'Evasive'} attacker · ${battleCard.attack}/${battleCard.health}`;
    if (role === 'defensiveCreature') return `Defensive creature · ${battleCard.attack}/${battleCard.health}`;
    if (role === 'utilityCreature') return `Utility creature · ${battleCard.attack}/${battleCard.health}`;
    return `Creature · ${battleCard.attack}/${battleCard.health}`;
  }
  if (role === 'damageSpell') return `Deal ${effect.amount || 1} damage`;
  if (role === 'removalSpell') return effect.type === 'removeCreature' ? 'Destroy an enemy creature' : `Damage an enemy creature`;
  if (role === 'healSpell') return effect.type === 'drain' ? `Drain ${effect.amount || 1}` : `Heal ${effect.amount || 1}`;
  if (role === 'drawSpell') return `Draw ${effect.amount || 1} card${effect.amount === 1 ? '' : 's'}`;
  if (role === 'tokenSpell') return `Create ${effect.amount || 1} token${effect.amount === 1 ? '' : 's'}`;
  if (role === 'equipmentBuff') return `Equip: +${effect.attackBonus ?? 1}/+${effect.healthBonus ?? 0}`;
  if (role === 'landResource') return 'Gain 1 mana';
  if (effects.length) return effects.map((item) => item.description || describe(item).description).join(', ');
  return ROLE_LABELS[role] || 'Useful battle card';
}

export function getBattleCardEffectSummary(battleCard) {
  return getBattleCardSummary(battleCard);
}

export function mapCollectionCardToBattleCard(card) {
  const initialCard = { ...(card || {}) };
  const override = getBattleCardOverride(initialCard);
  const sourceCard = { ...initialCard, ...(override?.cardPatch || {}) };
  const mainFace = getPrimaryCardFace(sourceCard);
  const colors = normalizeColors(sourceCard);
  const colorSignature = getColorSignature(colors);
  const colorBalance = getColorBalanceModifier(colors);
  const cost = clampCost(getManaValue(sourceCard) + colorBalance.costModifier);
  const roleInfo = determineBattleRole(sourceCard);
  const role = override?.role || roleInfo.role;
  const type = override?.type || (roleInfo.category === 'creature' || roleInfo.category === 'vehicle' ? 'creature' : role);
  const rarityBonus = getRarityBonus(sourceCard);
  const keywords = getBattleKeywords(sourceCard);
  const parsedStats = parsePowerToughness(sourceCard);
  let attack = 0;
  let health = 0;

  if (type === 'creature') {
    attack = parsedStats.attack;
    health = parsedStats.health;
    if (rarityBonus >= 2) attack += 1;
    if (rarityBonus >= 3) health += 1;
  }

  const effects = override?.effects || (type === 'creature' ? [] : getEffectsForRole(sourceCard, role, cost, colors));
  const battleCard = {
    attack,
    battleId: `${sourceCard.userCardId || sourceCard.collectionId || sourceCard.id || sourceCard.name}-battle`,
    category: roleInfo.category,
    colorIdentity: getColorIdentity(sourceCard),
    colorName: getColorCombinationName(colors),
    colorProfile: getColorEffectProfile(colors),
    colorSignature,
    colors,
    colorStrategy: getColorStrategy(colors),
    cost,
    displayType: getDisplayType(role, roleInfo.category),
    effectSummary: '',
    effects,
    foilTreatment: sourceCard.foilTreatment || sourceCard.foil_treatment || null,
    health,
    imageUrl: getImageUrl(sourceCard),
    isFoil: Boolean(sourceCard.isFoil),
    keywords,
    mapping: { ...roleInfo, role },
    maxHealth: health,
    name: sourceCard.name || mainFace?.name || 'Unknown Card',
    oracleText: getCombinedOracleText(sourceCard) || getFaceField(mainFace, 'oracle_text', 'oracleText'),
    originalPower: parsedStats.originalPower,
    originalToughness: parsedStats.originalToughness,
    primaryColor: getPrimaryColor(sourceCard),
    rarity: getField(sourceCard, 'rarity', 'rarity', 'common'),
    role,
    scryfallId: sourceCard.id || sourceCard.scryfall_id || null,
    setCode: sourceCard.set || sourceCard.set_code || null,
    setName: sourceCard.set_name || sourceCard.setName || null,
    sourceCard,
    type,
    userCardId: sourceCard.userCardId || sourceCard.collectionId || null,
  };

  const adjustedCard = applyColorStatAdjustments(battleCard);
  return {
    ...adjustedCard,
    effectSummary: getBattleCardSummary(adjustedCard),
  };
}

export function mapCollectionToBattleCards(collection) {
  const cards = (collection || []).map(mapCollectionCardToBattleCard);
  return INCLUDE_LANDS_IN_BATTLE ? cards : cards.filter((card) => card.category !== 'land');
}
