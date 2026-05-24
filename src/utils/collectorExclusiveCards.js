// Collector-exclusive metadata helpers for special variants and the serialized One Ring.
export const COLLECTOR_EXCLUSIVE_BY_SET = {
  // Set-code specific overrides can be added here.
  // Use lower-case Scryfall set codes.
  // Values can be Scryfall ids, collector numbers, or exact names.
  fin: {
    collectorNumbers: [],
    names: [],
    scryfallIds: [],
  },
  mh3: {
    collectorNumbers: [],
    names: [],
    scryfallIds: [],
  },
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function isOneOfOneRing(card) {
  // The one-of-one flag can come from app metadata or the local serialized Ring fallback.
  if (
    card?.isOneOfOne === true ||
    card?.collectorExclusiveReason === 'one-of-one' ||
    card?.specialPullType === 'one-of-one-ring'
  ) {
    return true;
  }

  if (card?.name !== 'The One Ring') {
    return false;
  }

  const collectorNumber = String(card.collector_number || '');

  return (
    collectorNumber === '001/001' ||
    collectorNumber.includes('001')
  );
}

export function markOneOfOneRing(card) {
  return markCollectorExclusive(
    {
      ...card,
      isOneOfOne: true,
      specialPullType: 'one-of-one-ring',
    },
    'one-of-one',
  );
}

export function isManualCollectorExclusive(card) {
  const setCode = normalize(card?.set);
  const overrides = COLLECTOR_EXCLUSIVE_BY_SET[setCode];

  if (!overrides) {
    return false;
  }

  const scryfallIds = new Set((overrides.scryfallIds || []).map(normalize));
  const collectorNumbers = new Set((overrides.collectorNumbers || []).map(normalize));
  const names = new Set((overrides.names || []).map(normalize));

  return (
    scryfallIds.has(normalize(card?.id)) ||
    collectorNumbers.has(normalize(card?.collector_number)) ||
    names.has(normalize(card?.name))
  );
}

export function markCollectorExclusive(card, reason = 'collector-exclusive') {
  return {
    ...card,
    isCollectorExclusive: true,
    collectorExclusiveReason: reason,
  };
}
