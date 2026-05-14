import { supabase } from '../lib/supabaseClient.js';
import { normalizeArenaCardName } from '../utils/battleCardOverrides.js';

const SCRYFALL_REQUEST_INTERVAL_MS = 140;
const SCRYFALL_NAMED_URL = 'https://api.scryfall.com/cards/named';

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function needsBattleData(card) {
  return !card?.type_line && !card?.oracle_text;
}

function toBattleDataPatch(scryfallCard) {
  return {
    card_faces: scryfallCard.card_faces || [],
    cmc: Number(scryfallCard.cmc ?? scryfallCard.mana_value ?? 0),
    color_identity: scryfallCard.color_identity || [],
    colors: scryfallCard.colors || scryfallCard.card_faces?.[0]?.colors || [],
    full_scryfall_data: scryfallCard,
    keywords: scryfallCard.keywords || [],
    layout: scryfallCard.layout || null,
    legalities: scryfallCard.legalities || {},
    mana_cost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost || null,
    oracle_text: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text || null,
    power: scryfallCard.power || scryfallCard.card_faces?.find((face) => face.power !== undefined)?.power || null,
    toughness: scryfallCard.toughness || scryfallCard.card_faces?.find((face) => face.toughness !== undefined)?.toughness || null,
    type_line: scryfallCard.type_line || scryfallCard.card_faces?.[0]?.type_line || null,
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to be logged in to refresh battle data.');
  }

  return data.user.id;
}

async function fetchScryfallCard(scryfallId) {
  const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Scryfall lookup failed for ${scryfallId}.`);
  }

  return response.json();
}

async function fetchScryfallCardByExactName(cardName) {
  const response = await fetch(`${SCRYFALL_NAMED_URL}?exact=${encodeURIComponent(cardName)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Scryfall name lookup failed for ${cardName}.`);
  }

  return response.json();
}

async function fetchScryfallCardForBattleData(card) {
  const scryfallId = card.scryfallId || card.id;
  const namesToTry = [
    card.name,
    normalizeArenaCardName(card.name),
  ].filter(Boolean);

  if (scryfallId) {
    try {
      return await fetchScryfallCard(scryfallId);
    } catch (error) {
      console.warn('Scryfall id lookup failed while refreshing battle data:', scryfallId, error);
    }
  }

  for (const cardName of [...new Set(namesToTry)]) {
    try {
      return await fetchScryfallCardByExactName(cardName);
    } catch (error) {
      console.warn('Scryfall name lookup failed while refreshing battle data:', cardName, error);
    }
  }

  throw new Error(`Unable to refresh battle data for ${card.name || scryfallId || 'that card'}.`);
}

export async function enrichMissingBattleData(cards = []) {
  const userId = await getCurrentUserId();
  const cardsToEnrich = cards.filter(needsBattleData).filter((card) => card.scryfallId || card.id || card.name);
  const enrichedCardsById = new Map();
  let updatedCount = 0;

  for (const card of cardsToEnrich) {
    const userCardId = card.userCardId || card.collectionId;

    if (!userCardId) continue;

    await wait(SCRYFALL_REQUEST_INTERVAL_MS);
    const scryfallCard = await fetchScryfallCardForBattleData(card);
    const patch = toBattleDataPatch(scryfallCard);
    const { error } = await supabase
      .from('user_cards')
      .update(patch)
      .eq('id', userCardId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Unable to update battle data for a card.');
    }

    updatedCount += 1;
    enrichedCardsById.set(userCardId, {
      ...card,
      ...patch,
      full_scryfall_data: scryfallCard,
    });
  }

  return {
    cards: cards.map((card) => enrichedCardsById.get(card.userCardId || card.collectionId) || card),
    updatedCount,
  };
}
