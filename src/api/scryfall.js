import { FOIL_TREATMENTS } from '../utils/foilTypes.js';
import { markCollectorExclusive } from '../utils/collectorExclusiveCards.js';

const SCRYFALL_BASE_URL = 'https://api.scryfall.com';
const SCRYFALL_REQUEST_INTERVAL_MS = 140;
const getRequestCache = new Map();
let scryfallRequestQueue = Promise.resolve();

const NON_OPENABLE_SET_TYPES = new Set([
  'token',
  'memorabilia',
  'promo',
  'box',
  'minigame',
  'treasure_chest',
  'vanguard',
]);

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

async function fetchJson(url, options = {}) {
  const method = options.method || 'GET';
  const canUseCache = method === 'GET';

  if (canUseCache && getRequestCache.has(url)) {
    return getRequestCache.get(url);
  }

  let response;

  try {
    const queuedRequest = scryfallRequestQueue.then(async () => {
      await wait(SCRYFALL_REQUEST_INTERVAL_MS);
      return fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
    });

    scryfallRequestQueue = queuedRequest.catch(() => {});
    response = await queuedRequest;
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

  if (canUseCache) {
    getRequestCache.set(url, payload);
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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  const prices = card.prices || {};

  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    type_line: card.type_line,
    frame: card.frame,
    frame_effects: card.frame_effects || [],
    border_color: card.border_color,
    finishes: card.finishes || [],
    promo_types: card.promo_types || [],
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
    oracle_text: card.oracle_text || card.card_faces?.[0]?.oracle_text || '',
    colors: card.colors || card.card_faces?.[0]?.colors || [],
    color_identity: card.color_identity || [],
    image: imageUrl,
    imageUrl,
    image_uris: card.image_uris || card.card_faces?.[0]?.image_uris || null,
    prices,
    foil: Boolean(card.foil),
    nonfoil: Boolean(card.nonfoil),
    usd: prices.usd || null,
    usd_foil: prices.usd_foil || null,
    usd_etched: prices.usd_etched || null,
    eur: prices.eur || null,
    eur_foil: prices.eur_foil || null,
    tix: prices.tix || null,
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
    .filter((set) => !NON_OPENABLE_SET_TYPES.has(set.set_type))
    .map(normalizeSet)
    .sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
}

export async function getCardsBySet(setCode) {
  const cards = await fetchPaginatedCards(buildSearchUrl(`set:${setCode.trim()}`));
  return normalizeCardsWithImages(cards);
}

function getCollectorNumberValue(card) {
  const match = String(card?.collector_number || '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function isCollectorStyleCandidate(card) {
  const frameEffects = card.frame_effects || [];
  const finishes = card.finishes || [];
  const promoTypes = card.promo_types || [];
  const hasSpecialFrame =
    card.frame === 'showcase' ||
    frameEffects.includes('showcase') ||
    frameEffects.includes('extendedart') ||
    card.border_color === 'borderless';
  const hasSpecialFinish = finishes.includes('etched');
  const hasBoosterFun = promoTypes.includes('boosterfun');
  const isRareOrMythic = card.rarity === 'rare' || card.rarity === 'mythic';
  const hasHighCollectorNumber = getCollectorNumberValue(card) > 300;

  return hasSpecialFrame || hasSpecialFinish || hasBoosterFun || (isRareOrMythic && hasHighCollectorNumber);
}

async function fetchCollectorCandidateQuery(query) {
  try {
    return await fetchPaginatedCards(buildSearchUrl(query), { allowEmpty: true });
  } catch {
    return [];
  }
}

export async function getCollectorExclusiveCandidates(setCode) {
  const normalizedSetCode = setCode.trim().toLowerCase();
  const queries = [
    `set:${normalizedSetCode} (frame:showcase OR frame:borderless OR frame:extendedart)`,
    `set:${normalizedSetCode} (is:foil OR is:etched)`,
    `set:${normalizedSetCode} (rarity:rare OR rarity:mythic) (frame:showcase OR frame:borderless OR frame:extendedart)`,
  ];

  if (normalizedSetCode !== 'ltr') {
    queries.push(`set:${normalizedSetCode} number:>300`);
  }

  const candidatePages = [];
  const candidatesById = new Map();

  for (const query of queries) {
    candidatePages.push(await fetchCollectorCandidateQuery(query));
    await wait(140);
  }

  for (const card of candidatePages.flat()) {
    if (getCardImage(card)) {
      candidatesById.set(card.id, card);
    }
  }

  return [...candidatesById.values()]
    .map(normalizeCard)
    .filter(isCollectorStyleCandidate)
    .map((card) => markCollectorExclusive(card, 'special-collector-variant'));
}

export async function getCardById(cardId) {
  const card = await fetchJson(`${SCRYFALL_BASE_URL}/cards/${encodeURIComponent(cardId)}`);

  return normalizeCard(card);
}

export async function getCardsByIds(cardIds) {
  const identifiers = [...new Set(cardIds.filter(Boolean))].map((id) => ({ id }));

  if (!identifiers.length) {
    return [];
  }

  const payload = await fetchJson(`${SCRYFALL_BASE_URL}/cards/collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifiers }),
  });

  return (payload.data || []).map(normalizeCard);
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
