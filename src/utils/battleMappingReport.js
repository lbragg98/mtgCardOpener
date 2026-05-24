import { mapCollectionCardToBattleCard } from './battleCardMapper.js';

function increment(counts, key) {
  const safeKey = key || 'unknown';
  counts[safeKey] = (counts[safeKey] || 0) + 1;
  return counts;
}

export function generateBattleMappingReport(collection = []) {
  const mappedCards = (collection || []).map(mapCollectionCardToBattleCard);

  return mappedCards.reduce((report, card) => {
    const confidence = card.mapping?.confidence || 'low';

    report.total += 1;
    if (confidence === 'high') report.highConfidence += 1;
    else if (confidence === 'medium') report.mediumConfidence += 1;
    else report.lowConfidence += 1;

    increment(report.byRole, card.role || card.mapping?.role || card.type);
    increment(report.byCategory, card.category || card.mapping?.category);

    if (confidence === 'low' || card.role === 'colorFallbackSpell') {
      report.lowConfidenceCards.push({
        category: card.category,
        confidence,
        name: card.name,
        reason: card.mapping?.reason || 'Fallback mapping',
        role: card.role,
      });
    }

    return report;
  }, {
    byCategory: {},
    byRole: {},
    highConfidence: 0,
    lowConfidence: 0,
    lowConfidenceCards: [],
    mediumConfidence: 0,
    total: 0,
  });
}
