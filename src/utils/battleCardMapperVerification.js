import { mapCollectionCardToBattleCard } from './battleCardMapper.js';

const SAMPLE_CARDS = [
  { cmc: 2, name: 'Sample Bear', power: '3', rarity: 'common', toughness: '2', type_line: 'Creature - Bear' },
  { cmc: 4, name: 'Star Beast', oracle_text: "Star Beast's power is equal to cards in hand.", power: '*', rarity: 'rare', toughness: '*', type_line: 'Creature - Beast' },
  { cmc: 2, name: 'Sample Bolt', oracle_text: 'Sample Bolt deals 3 damage to any target.', rarity: 'common', type_line: 'Instant' },
  { cmc: 3, name: 'Sample Insight', oracle_text: 'Draw two cards.', rarity: 'uncommon', type_line: 'Sorcery' },
  { cmc: 3, name: 'Sample Anthem', oracle_text: 'Creatures you control get +1/+1.', rarity: 'rare', type_line: 'Enchantment' },
  { cmc: 2, name: 'Sample Weakness', oracle_text: 'Enchant creature. Enchanted creature gets -2/-2.', rarity: 'common', type_line: 'Enchantment - Aura' },
  { cmc: 1, name: 'Sample Sword', oracle_text: 'Equipped creature gets +2/+1. Equip 2.', rarity: 'uncommon', type_line: 'Artifact - Equipment' },
  { cmc: 4, loyalty: '4', name: 'Sample Walker', oracle_text: '+1: Draw a card. -2: Create a 2/2 token.', rarity: 'mythic', type_line: 'Legendary Planeswalker' },
  { cmc: 0, name: 'Sample Land', produced_mana: ['G'], rarity: 'common', type_line: 'Land' },
  { cmc: 4, name: 'Sample Maker', oracle_text: 'Create two 1/1 creature tokens.', rarity: 'uncommon', type_line: 'Sorcery' },
  {
    card_faces: [
      { name: 'Front', oracle_text: 'Draw a card.', type_line: 'Instant' },
      { name: 'Back', oracle_text: 'Deal 2 damage to any target.', type_line: 'Sorcery' },
    ],
    cmc: 2,
    name: 'Sample Split',
    rarity: 'rare',
  },
  { cmc: 1, name: 'Blank Relic', rarity: 'common', type_line: 'Artifact' },
];

export function verifyBattleCardMapperSamples() {
  return SAMPLE_CARDS.map(mapCollectionCardToBattleCard).map((card) => ({
    category: card.mapping.category,
    confidence: card.mapping.confidence,
    effectSummary: card.effectSummary,
    name: card.name,
    role: card.role,
    type: card.type,
  }));
}
