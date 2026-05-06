import { FOIL_TREATMENTS } from '../utils/foilTypes.js';

const SCRYFALL_BASE_URL = 'https://api.scryfall.com';

const EXCLUDED_SET_TYPES = new Set([
  'token',
  'memorabilia',
  'promo',
  'funny',
  'box',
  'commander',
  'duel_deck',
  'planechase',
  'archenemy',
  'treasure_chest',
]);

const INCLUDED_SET_TYPES = new Set(['expansion', 'core']);

class ScryfallApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = 'ScryfallApiError';
    this.code = code;
    this.status = status;
  }
}

function buildSearchUrl(query) {
  const url = new URL('/cards/search', SCRYFALL_BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('unique', 'prints');
  return url.toString();
}

async function fetchJson(url) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ScryfallApiError('Unable to reach Scryfall. Check your network connection and try again.');
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new ScryfallApiError(`Scryfall returned an unreadable response with status ${response.status}.`, {
      status: response.status,
    });
  }

  if (!response.ok) {
    const message = payload?.details || payload?.warning || payload?.code || 'Unknown Scryfall error';
    throw new ScryfallApiError(`Scryfall request failed: ${message}`, {
      code: payload?.code,
      status: response.status,
    });
  }

  return payload;
}

async function fetchPaginatedCards(initialUrl, { allowEmpty = false } = {}) {
  const cards = [];
  let nextUrl = initialUrl;

  while (nextUrl) {
    let page;

    try {
      page = await fetchJson(nextUrl);
    } catch (error) {
      if (allowEmpty && cards.length === 0 && error.code === 'not_found') {
        return [];
      }

      throw error;
    }

    cards.push(...(page.data || []));
    nextUrl = page.has_more ? page.next_page : null;
  }

  return cards;
}

function normalizeSet(set) {
  return {
    code: set.code,
    name: set.name,
    released_at: set.released_at,
    icon_svg_uri: set.icon_svg_uri,
    card_count: set.card_count,
    set_type: set.set_type,
  };
}

function normalizeCard(card) {
  const imageUrl = getCardImage(card);

  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    type_line: card.type_line,
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
    oracle_text: card.oracle_text || card.card_faces?.[0]?.oracle_text || '',
    colors: card.colors || card.card_faces?.[0]?.colors || [],
    color_identity: card.color_identity || [],
    image: imageUrl,
    image_uris: card.image_uris || card.card_faces?.[0]?.image_uris || null,
    isFoil: false,
    foilTreatment: FOIL_TREATMENTS.NONE,
    scryfall_uri: card.scryfall_uri,
  };
}

function normalizeCardsWithImages(cards) {
  return cards.filter((card) => Boolean(getCardImage(card))).map(normalizeCard);
}

export function getCardImage(card) {
  const imageUris = card?.image_uris || card?.card_faces?.[0]?.image_uris;

  if (!imageUris) {
    return null;
  }

  return imageUris.large || imageUris.normal || null;
}

export async function getSets() {
  const payload = await fetchJson(`${SCRYFALL_BASE_URL}/sets`);

  return (payload.data || [])
    .filter((set) => INCLUDED_SET_TYPES.has(set.set_type) && !EXCLUDED_SET_TYPES.has(set.set_type))
    .map(normalizeSet)
    .sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
}

export async function getCardsBySet(setCode) {
  const cards = await fetchPaginatedCards(buildSearchUrl(`set:${setCode.trim()}`));
  return normalizeCardsWithImages(cards);
}

export async function getArtCardsBySet(setCode) {
  const cards = await fetchPaginatedCards(buildSearchUrl(`set:${setCode.trim()} type:art include:extras`), {
    allowEmpty: true,
  });

  return normalizeCardsWithImages(cards);
}

export async function getCardsBySetAndRarity(setCode, rarity) {
  const cards = await fetchPaginatedCards(buildSearchUrl(`set:${setCode.trim()} rarity:${rarity.trim()}`));
  return normalizeCardsWithImages(cards);
}

export async function getLandsBySet(setCode) {
  const cards = await fetchPaginatedCards(buildSearchUrl(`set:${setCode.trim()} (type:basic or type:land)`));
  return normalizeCardsWithImages(cards);
}

export async function getTokensBySet(setCode) {
  const normalizedSetCode = setCode.trim().toLowerCase();
  const tokenSetCode = `t${normalizedSetCode}`;

  const tokenSetCards = await fetchPaginatedCards(buildSearchUrl(`set:${tokenSetCode} include:extras`), {
    allowEmpty: true,
  });

  if (tokenSetCards.length > 0) {
    return normalizeCardsWithImages(tokenSetCards);
  }

  const cards = await fetchPaginatedCards(
    buildSearchUrl(`set:${normalizedSetCode} type:token include:extras`),
    { allowEmpty: true },
  );

  return normalizeCardsWithImages(cards);
}
