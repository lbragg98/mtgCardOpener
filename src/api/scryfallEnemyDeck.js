import { mapCollectionCardToBattleCard } from '../utils/battleCardMapper.js';
import { normalizeArenaCardName } from '../utils/battleCardOverrides.js';
import { RED_STARTER_ENEMY_DECK_NAMES } from '../utils/enemyDecks.js';

const SCRYFALL_NAMED_URL = 'https://api.scryfall.com/cards/named';
const SCRYFALL_REQUEST_INTERVAL_MS = 140;

let redStarterDeckCache = null;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createRedFallbackCard(cardName) {
  return {
    id: `red-fallback-${cardName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: 'Red Spark',
    type_line: 'Sorcery',
    oracle_text: 'Red Spark deals 2 damage to any target.',
    mana_cost: '{R}',
    cmc: 1,
    colors: ['R'],
    color_identity: ['R'],
    keywords: [],
    card_faces: [],
    image_uris: null,
    rarity: 'common',
    set: 'starter',
    set_name: 'Binder Battle Starter',
    collector_number: 'R',
    prices: {},
    layout: 'normal',
    legalities: {},
  };
}

function normalizeEnemyScryfallCard(card) {
  return {
    id: card.id,
    name: card.name,
    type_line: card.type_line || card.card_faces?.[0]?.type_line || '',
    oracle_text: card.oracle_text || card.card_faces?.[0]?.oracle_text || '',
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
    cmc: Number(card.cmc ?? card.mana_value ?? 0),
    mana_value: Number(card.mana_value ?? card.cmc ?? 0),
    power: card.power || card.card_faces?.find((face) => face.power !== undefined)?.power || null,
    toughness: card.toughness || card.card_faces?.find((face) => face.toughness !== undefined)?.toughness || null,
    colors: card.colors || card.card_faces?.[0]?.colors || [],
    color_identity: card.color_identity || [],
    keywords: card.keywords || [],
    card_faces: card.card_faces || [],
    image_uris: card.image_uris || card.card_faces?.[0]?.image_uris || null,
    imageUrl: card.image_uris?.large || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.large || card.card_faces?.[0]?.image_uris?.normal || '',
    image: card.image_uris?.large || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.large || card.card_faces?.[0]?.image_uris?.normal || '',
    rarity: card.rarity || 'common',
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    prices: card.prices || {},
    layout: card.layout || null,
    legalities: card.legalities || {},
    full_scryfall_data: card,
  };
}

async function fetchEnemyCardByName(cardName) {
  const namesToTry = [...new Set([cardName, normalizeArenaCardName(cardName)].filter(Boolean))];

  for (const nameToTry of namesToTry) {
    const url = `${SCRYFALL_NAMED_URL}?exact=${encodeURIComponent(nameToTry)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (response.ok) {
      return normalizeEnemyScryfallCard(await response.json());
    }
  }

  throw new Error(`Unable to fetch enemy card: ${cardName}`);
}

export async function fetchEnemyDeckByNames(cardNames = RED_STARTER_ENEMY_DECK_NAMES) {
  const fetchedCards = [];

  for (const cardName of cardNames) {
    try {
      await wait(SCRYFALL_REQUEST_INTERVAL_MS);
      fetchedCards.push(await fetchEnemyCardByName(cardName));
    } catch {
      fetchedCards.push(createRedFallbackCard(cardName));
    }
  }

  return fetchedCards
    .map((card, index) => ({
      ...mapCollectionCardToBattleCard(card),
      battleId: `red-starter-${index}-${card.id || card.name}`,
      userCardId: `red-starter-${index}-${card.id || card.name}`,
    }))
    .filter((card) => card.type !== 'land')
    .slice(0, 20);
}

export async function fetchRedStarterEnemyDeck() {
  if (!redStarterDeckCache) {
    redStarterDeckCache = fetchEnemyDeckByNames(RED_STARTER_ENEMY_DECK_NAMES);
  }

  return redStarterDeckCache;
}
