export const BATTLE_CARD_OVERRIDES = {
  'A-Vivi Ornitier': {
    cardPatch: {
      cmc: 3,
      color_identity: ['R', 'U'],
      colors: ['R', 'U'],
      mana_cost: '{1}{U}{R}',
      oracle_text: "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.",
      power: '0',
      toughness: '3',
      type_line: 'Legendary Creature — Wizard',
    },
  },
  'a-vivi ornitier': {
    cardPatch: {
      cmc: 3,
      color_identity: ['R', 'U'],
      colors: ['R', 'U'],
      mana_cost: '{1}{U}{R}',
      oracle_text: "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.",
      power: '0',
      toughness: '3',
      type_line: 'Legendary Creature — Wizard',
    },
  },
  'Vivi Ornitier': {
    cardPatch: {
      cmc: 3,
      color_identity: ['R', 'U'],
      colors: ['R', 'U'],
      mana_cost: '{1}{U}{R}',
      oracle_text: "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.",
      power: '0',
      toughness: '3',
      type_line: 'Legendary Creature — Wizard',
    },
  },
  'vivi ornitier': {
    cardPatch: {
      cmc: 3,
      color_identity: ['R', 'U'],
      colors: ['R', 'U'],
      mana_cost: '{1}{U}{R}',
      oracle_text: "{T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power.\nWhenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each opponent.",
      power: '0',
      toughness: '3',
      type_line: 'Legendary Creature — Wizard',
    },
  },
  'Pull from the Grave': {
    type: 'reanimateSpell',
    effects: [
      {
        amount: 1,
        description: 'Return a creature from your graveyard',
        targetType: 'self',
        type: 'reanimate',
      },
    ],
  },
  'pull from the grave': {
    type: 'reanimateSpell',
    effects: [
      {
        amount: 1,
        description: 'Return a creature from your graveyard',
        targetType: 'self',
        type: 'reanimate',
      },
    ],
  },
};

export function normalizeArenaCardName(name) {
  return String(name || '').replace(/^A-/i, '').trim();
}

export function getBattleCardOverride(card) {
  const normalizedName = normalizeArenaCardName(card?.name);
  const ids = [
    card?.scryfall_id,
    card?.scryfallId,
    card?.id,
    card?.full_scryfall_data?.id,
    card?.name,
    card?.name ? String(card.name).toLowerCase() : null,
    normalizedName,
    normalizedName.toLowerCase(),
  ].filter(Boolean);

  const overrideKey = ids.find((id) => BATTLE_CARD_OVERRIDES[id] || BATTLE_CARD_OVERRIDES[String(id).toLowerCase()]);
  return overrideKey ? BATTLE_CARD_OVERRIDES[overrideKey] || BATTLE_CARD_OVERRIDES[String(overrideKey).toLowerCase()] : null;
}
