export const mockSets = [
  {
    code: 'dmu',
    name: 'Dominaria United',
    flavor: 'Classic legends, stained glass treatments, and a plane full of history.',
    color: '#a57cff',
  },
  {
    code: 'neo',
    name: 'Kamigawa: Neon Dynasty',
    flavor: 'Cyberpunk magic, sagas, artifacts, and sharp blue-pink neon.',
    color: '#4cc9f0',
  },
  {
    code: 'lci',
    name: 'The Lost Caverns of Ixalan',
    flavor: 'Dinosaurs, ancient treasure, and glowing underworld secrets.',
    color: '#f4c95d',
  },
];

export const mockCollection = [
  { id: '1', name: 'Serra Paragon', set: 'dmu', rarity: 'Mythic Rare', count: 1 },
  { id: '2', name: 'The Wandering Emperor', set: 'neo', rarity: 'Mythic Rare', count: 1 },
  { id: '3', name: 'Roaming Throne', set: 'lci', rarity: 'Rare', count: 2 },
];

export const mockPackPreview = [
  { slot: 'Rare or Mythic', status: 'Ready later' },
  { slot: 'Uncommons', status: 'Mock placeholder' },
  { slot: 'Commons', status: 'Mock placeholder' },
  { slot: 'Basic Land', status: 'Mock placeholder' },
];
