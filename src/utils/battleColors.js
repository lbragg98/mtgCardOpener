export const COLORS = {
  WHITE: 'W',
  BLUE: 'U',
  BLACK: 'B',
  RED: 'R',
  GREEN: 'G',
  COLORLESS: 'C',
};

export const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];

const CANONICAL_SIGNATURES = {
  UBG: 'BGU',
  UG: 'GU',
  URG: 'GUR',
  WBR: 'RWB',
  WBRG: 'BRGW',
  WG: 'GW',
  WR: 'RW',
  WRG: 'RGW',
  WUBG: 'GWUB',
  WUG: 'GWU',
  WUR: 'URW',
  WURG: 'RGWU',
};

const UI_COLORS = {
  B: { border: 'rgba(154, 92, 214, 0.72)', chipBg: 'rgba(154, 92, 214, 0.16)', glow: 'rgba(154, 92, 214, 0.34)', text: '#d8b4fe' },
  C: { border: 'rgba(168, 162, 158, 0.62)', chipBg: 'rgba(168, 162, 158, 0.14)', glow: 'rgba(168, 162, 158, 0.24)', text: '#d6d3d1' },
  G: { border: 'rgba(74, 222, 128, 0.68)', chipBg: 'rgba(74, 222, 128, 0.14)', glow: 'rgba(74, 222, 128, 0.30)', text: '#bbf7d0' },
  R: { border: 'rgba(248, 113, 113, 0.72)', chipBg: 'rgba(248, 113, 113, 0.15)', glow: 'rgba(248, 113, 113, 0.34)', text: '#fecaca' },
  U: { border: 'rgba(96, 165, 250, 0.72)', chipBg: 'rgba(96, 165, 250, 0.15)', glow: 'rgba(96, 165, 250, 0.34)', text: '#bfdbfe' },
  W: { border: 'rgba(250, 204, 21, 0.72)', chipBg: 'rgba(250, 204, 21, 0.14)', glow: 'rgba(250, 204, 21, 0.30)', text: '#fef3c7' },
};

export const COLOR_EFFECT_PROFILES = {
  W: { name: 'White', strategy: 'Defensive healing and shields', preferredEffects: ['heal', 'shield', 'buff'], creatureBonus: { health: 1 }, spellBonus: { heal: 1, shield: 1 }, weakness: 'low burst damage', uiColors: UI_COLORS.W },
  U: { name: 'Blue', strategy: 'Draw and tempo', preferredEffects: ['draw', 'weaken', 'shield'], creatureBonus: {}, spellBonus: { draw: 1, weaken: 1 }, weakness: 'weaker raw stats', uiColors: UI_COLORS.U },
  B: { name: 'Black', strategy: 'Drain and removal', preferredEffects: ['drain', 'removal', 'damage'], creatureBonus: { attack: 1, health: -1 }, spellBonus: { drain: 1, removal: 1 }, weakness: 'resource pressure', uiColors: UI_COLORS.B },
  R: { name: 'Red', strategy: 'Fast direct damage', preferredEffects: ['damage', 'buff', 'token'], creatureBonus: { attack: 1, health: -1 }, spellBonus: { damage: 1 }, weakness: 'lower defense', uiColors: UI_COLORS.R },
  G: { name: 'Green', strategy: 'Growth and board strength', preferredEffects: ['buff', 'token', 'heal'], creatureBonus: { health: 1 }, spellBonus: { buff: 1, token: 1 }, weakness: 'limited removal and draw', uiColors: UI_COLORS.G },
  C: { name: 'Colorless', strategy: 'Flexible modest utility', preferredEffects: ['generic', 'draw', 'damage'], creatureBonus: {}, spellBonus: { generic: 0 }, weakness: 'less explosive', uiColors: UI_COLORS.C },
  WU: { name: 'Azorius', strategy: 'Control and protection', preferredEffects: ['shield', 'draw', 'weaken'], creatureBonus: { health: 1 }, spellBonus: { shield: 1 }, weakness: 'low burst damage', uiColors: blendUiColors('W', 'U') },
  UB: { name: 'Dimir', strategy: 'Card advantage and debuffs', preferredEffects: ['draw', 'weaken', 'drain'], creatureBonus: {}, spellBonus: { weaken: 1 }, weakness: 'slower pressure', uiColors: blendUiColors('U', 'B') },
  BR: { name: 'Rakdos', strategy: 'Aggressive damage', preferredEffects: ['damage', 'drain', 'sacrifice'], creatureBonus: { attack: 1, health: -1 }, spellBonus: { damage: 1 }, weakness: 'lower defense', uiColors: blendUiColors('B', 'R') },
  RG: { name: 'Gruul', strategy: 'Big attacks and trample pressure', preferredEffects: ['buff', 'damage', 'token'], creatureBonus: { attack: 1 }, spellBonus: { buff: 1 }, weakness: 'limited card advantage', uiColors: blendUiColors('R', 'G') },
  GW: { name: 'Selesnya', strategy: 'Tokens, healing, and team buffs', preferredEffects: ['token', 'heal', 'buff'], creatureBonus: { health: 1 }, spellBonus: { token: 1 }, weakness: 'low removal', uiColors: blendUiColors('G', 'W') },
  WB: { name: 'Orzhov', strategy: 'Lifedrain and sustain', preferredEffects: ['drain', 'heal', 'removal'], creatureBonus: { health: 1 }, spellBonus: { drain: 1 }, weakness: 'slow value', uiColors: blendUiColors('W', 'B') },
  UR: { name: 'Izzet', strategy: 'Spells, damage, and draw', preferredEffects: ['damage', 'draw', 'weaken'], creatureBonus: {}, spellBonus: { damage: 1 }, weakness: 'fragile board', uiColors: blendUiColors('U', 'R') },
  BG: { name: 'Golgari', strategy: 'Durable drain midrange', preferredEffects: ['drain', 'removal', 'token'], creatureBonus: { health: 1 }, spellBonus: { drain: 1 }, weakness: 'moderate speed', uiColors: blendUiColors('B', 'G') },
  RW: { name: 'Boros', strategy: 'Fast combat', preferredEffects: ['damage', 'buff', 'shield'], creatureBonus: { attack: 1 }, spellBonus: { buff: 1 }, weakness: 'can run out of value', uiColors: blendUiColors('R', 'W') },
  GU: { name: 'Simic', strategy: 'Growth and draw', preferredEffects: ['buff', 'draw', 'token'], creatureBonus: { health: 1 }, spellBonus: { buff: 1 }, weakness: 'limited removal', uiColors: blendUiColors('G', 'U') },
  WUB: { name: 'Esper', strategy: 'Control, shields, draw, small drain', preferredEffects: ['shield', 'draw', 'drain'], creatureBonus: { health: 1 }, spellBonus: { shield: 1 }, weakness: 'low aggression', uiColors: blendUiColors('W', 'U') },
  UBR: { name: 'Grixis', strategy: 'Damage, draw, removal, drain', preferredEffects: ['damage', 'draw', 'removal'], creatureBonus: { attack: 1 }, spellBonus: { damage: 1 }, weakness: 'limited healing', uiColors: blendUiColors('U', 'R') },
  BRG: { name: 'Jund', strategy: 'Removal, big creatures, sacrifice value', preferredEffects: ['removal', 'buff', 'drain'], creatureBonus: { attack: 1 }, spellBonus: { removal: 1 }, weakness: 'costly effects', uiColors: blendUiColors('B', 'G') },
  RGW: { name: 'Naya', strategy: 'Big creatures, team buffs, tokens', preferredEffects: ['token', 'buff', 'heal'], creatureBonus: { health: 1 }, spellBonus: { token: 1 }, weakness: 'limited draw', uiColors: blendUiColors('R', 'W') },
  GWU: { name: 'Bant', strategy: 'Shields, growth, draw', preferredEffects: ['shield', 'buff', 'draw'], creatureBonus: { health: 1 }, spellBonus: { shield: 1 }, weakness: 'lower burst', uiColors: blendUiColors('G', 'U') },
  WBG: { name: 'Abzan', strategy: 'Lifegain, counters, durability', preferredEffects: ['heal', 'buff', 'drain'], creatureBonus: { health: 1 }, spellBonus: { heal: 1 }, weakness: 'wins slowly', uiColors: blendUiColors('W', 'G') },
  URW: { name: 'Jeskai', strategy: 'Spells, tempo, combat tricks', preferredEffects: ['draw', 'damage', 'buff'], creatureBonus: {}, spellBonus: { draw: 1 }, weakness: 'modest bodies', uiColors: blendUiColors('U', 'R') },
  BGU: { name: 'Sultai', strategy: 'Value, draw, drain, graveyard style', preferredEffects: ['draw', 'drain', 'token'], creatureBonus: { health: 1 }, spellBonus: { drain: 1 }, weakness: 'slower starts', uiColors: blendUiColors('B', 'U') },
  RWB: { name: 'Mardu', strategy: 'Fast attacks, lifedrain, combat pressure', preferredEffects: ['damage', 'drain', 'buff'], creatureBonus: { attack: 1 }, spellBonus: { damage: 1 }, weakness: 'lower defense', uiColors: blendUiColors('R', 'B') },
  GUR: { name: 'Temur', strategy: 'Big creatures, damage, growth', preferredEffects: ['buff', 'damage', 'draw'], creatureBonus: { attack: 1 }, spellBonus: { buff: 1 }, weakness: 'limited sustain', uiColors: blendUiColors('G', 'R') },
  WUBR: { name: 'Four-Color Artifice', strategy: 'Flexible control and pressure', preferredEffects: ['draw', 'damage', 'shield'], creatureBonus: {}, spellBonus: { draw: 1 }, weakness: 'slightly slower', uiColors: blendUiColors('W', 'R') },
  UBRG: { name: 'Four-Color Wilds', strategy: 'Value, damage, and growth', preferredEffects: ['draw', 'damage', 'buff'], creatureBonus: {}, spellBonus: { damage: 1 }, weakness: 'weaker defense', uiColors: blendUiColors('U', 'G') },
  BRGW: { name: 'Four-Color Warband', strategy: 'Combat, drain, and tokens', preferredEffects: ['token', 'drain', 'buff'], creatureBonus: {}, spellBonus: { token: 1 }, weakness: 'less card draw', uiColors: blendUiColors('B', 'W') },
  RGWU: { name: 'Four-Color Alliance', strategy: 'Team growth, draw, and shields', preferredEffects: ['buff', 'draw', 'shield'], creatureBonus: {}, spellBonus: { buff: 1 }, weakness: 'low removal', uiColors: blendUiColors('R', 'U') },
  GWUB: { name: 'Four-Color Covenant', strategy: 'Sustain, draw, and drain', preferredEffects: ['heal', 'draw', 'drain'], creatureBonus: {}, spellBonus: { heal: 1 }, weakness: 'slow pressure', uiColors: blendUiColors('G', 'B') },
  WUBRG: { name: 'Five-Color', strategy: 'Flexible magic with a balance tax', preferredEffects: ['flex', 'draw', 'buff', 'damage'], creatureBonus: {}, spellBonus: { flex: 1 }, weakness: 'slightly higher cost and reduced strength', uiColors: { border: 'rgba(244, 201, 93, 0.78)', chipBg: 'rgba(96, 165, 250, 0.14)', glow: 'rgba(244, 201, 93, 0.30)', text: '#fef3c7' } },
};

function blendUiColors(first, second) {
  const a = UI_COLORS[first] || UI_COLORS.C;
  const b = UI_COLORS[second] || UI_COLORS.C;
  return {
    border: a.border,
    chipBg: b.chipBg,
    glow: b.glow,
    text: a.text,
  };
}

export function normalizeColors(card) {
  const fullData = card?.full_scryfall_data || {};
  const explicitColors = card?.colors?.length
    ? card.colors
    : card?.color_identity || card?.colorIdentity || fullData.colors || fullData.color_identity;
  const faces = Array.isArray(card?.card_faces) && card.card_faces.length ? card.card_faces : fullData.card_faces;
  const faceColors = Array.isArray(faces)
    ? faces.flatMap((face) => face?.colors || face?.color_identity || face?.colorIdentity || [])
    : [];
  const sourceColors = card?.sourceCard ? normalizeColors(card.sourceCard) : [];
  const colors = explicitColors?.length ? explicitColors : faceColors.length ? faceColors : sourceColors;
  const normalizedColors = [...new Set((colors || []).filter((color) => COLOR_ORDER.includes(color)))];

  return normalizedColors.length ? normalizedColors.sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)) : ['C'];
}

export function getColorSignature(colors) {
  const normalizedColors = [...new Set((colors || []).filter(Boolean))];

  if (!normalizedColors.length || normalizedColors.includes('C') && normalizedColors.length === 1) return 'C';

  const sortedSignature = normalizedColors
    .filter((color) => COLOR_ORDER.includes(color))
    .sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
    .join('') || 'C';

  return CANONICAL_SIGNATURES[sortedSignature] || sortedSignature;
}

export function getPrimaryColor(card) {
  return normalizeColors(card).find((color) => color !== 'C') || 'C';
}

export function getColorCombinationName(colors) {
  return getColorEffectProfile(colors).name;
}

export function getColorStrategy(colors) {
  return getColorEffectProfile(colors).strategy;
}

export function getColorEffectProfile(colors) {
  const signature = getColorSignature(Array.isArray(colors) ? colors : normalizeColors(colors));
  return COLOR_EFFECT_PROFILES[signature] || COLOR_EFFECT_PROFILES.C;
}

export function getColorBadgeColors(colors) {
  return getColorEffectProfile(colors).uiColors;
}

export function getColorBalanceModifier(colors) {
  const signature = getColorSignature(colors);
  const colorCount = signature === 'C' ? 0 : signature.length;

  if (signature === 'C') {
    return { costModifier: 0, drawback: 'modest effects', effectStrengthModifier: 0.85, flexibilityBonus: false, statModifier: 0 };
  }
  if (colorCount === 1) {
    return { costModifier: 0, drawback: null, effectStrengthModifier: 1, flexibilityBonus: false, statModifier: 1 };
  }
  if (colorCount === 2) {
    return { costModifier: 0, drawback: null, effectStrengthModifier: 1.05, flexibilityBonus: false, statModifier: 1 };
  }
  if (colorCount === 3) {
    return { costModifier: 0, drawback: 'flexibility over raw power', effectStrengthModifier: 1, flexibilityBonus: true, statModifier: 1 };
  }
  if (colorCount === 4) {
    return { costModifier: 1, drawback: 'slower broad utility', effectStrengthModifier: 0.95, flexibilityBonus: true, statModifier: 0 };
  }
  return { costModifier: 1, drawback: 'balance tax', effectStrengthModifier: 0.9, flexibilityBonus: true, statModifier: 0 };
}
