import {
  COLOR_ORDER,
  getColorCombinationName,
  getColorSignature,
  getColorStrategy,
  normalizeColors,
} from './battleColors.js';

function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function increment(counts, key) {
  counts[key] = (counts[key] || 0) + 1;
}

function getAverageCost(deck) {
  if (!deck.length) return 0;
  return deck.reduce((total, card) => total + (card.cost || 1), 0) / deck.length;
}

function getTopSignature(signatureCounts) {
  return Object.entries(signatureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'C';
}

export function analyzeDeckColors(deck = []) {
  const colorCounts = { B: 0, C: 0, G: 0, R: 0, U: 0, W: 0 };
  const signatureCounts = {};

  deck.forEach((card) => {
    const colors = normalizeColors(card);
    const signature = card.colorSignature || getColorSignature(colors);

    increment(signatureCounts, signature);
    colors.forEach((color) => {
      if (colorCounts[color] !== undefined) {
        colorCounts[color] += 1;
      }
    });
  });

  const total = deck.length;
  const percentages = Object.fromEntries(
    [...COLOR_ORDER, 'C'].map((color) => [color, percent(colorCounts[color], total)]),
  );
  const multicolorCount = deck.filter((card) => (card.colors || normalizeColors(card)).filter((color) => color !== 'C').length > 1).length;
  const fiveColorCount = deck.filter((card) => (card.colorSignature || getColorSignature(normalizeColors(card))) === 'WUBRG').length;
  const topSignature = getTopSignature(signatureCounts);
  const pairCounts = Object.entries(signatureCounts).filter(([signature]) => signature.length === 2);
  const mostCommonColorPair = pairCounts.sort((a, b) => b[1] - a[1])[0]?.[0] || (topSignature.length === 2 ? topSignature : null);

  return {
    colorCounts,
    fiveColorCount,
    mostCommonColorPair,
    multicolorCount,
    percentages,
    signatureCounts,
    topColorName: getColorCombinationName(topSignature === 'C' ? ['C'] : topSignature.split('')),
    topColorSignature: topSignature,
    topColorStrategy: getColorStrategy(topSignature === 'C' ? ['C'] : topSignature.split('')),
  };
}

export function getDeckStrategy(deck = []) {
  if (!deck.length) return 'Select cards to reveal a deck strategy.';

  const colorAnalysis = analyzeDeckColors(deck);
  const { colorCounts, fiveColorCount, multicolorCount } = colorAnalysis;
  const total = deck.length;
  const redWhite = colorCounts.R + colorCounts.W;
  const blueBlack = colorCounts.U + colorCounts.B;
  const greenWhite = colorCounts.G + colorCounts.W;
  const greenBlue = colorCounts.G + colorCounts.U;
  const blackGreen = colorCounts.B + colorCounts.G;

  if (fiveColorCount >= Math.max(3, Math.ceil(total * 0.18))) return 'Flexible but slower deck';
  if (redWhite >= total * 1.05 && colorCounts.R >= 4) return 'Aggressive combat deck';
  if (blueBlack >= total * 1.05 && colorCounts.U >= 4) return 'Control and value deck';
  if (greenWhite >= total * 1.05 && colorCounts.G >= 4) return 'Creature swarm deck';
  if (greenBlue >= total * 1.05 && colorCounts.G >= 4) return 'Growth and card advantage deck';
  if (blackGreen >= total * 1.05 && colorCounts.B >= 4) return 'Grindy midrange deck';
  if (multicolorCount >= total * 0.4) return 'Hybrid strategy deck';
  return `${colorAnalysis.topColorName} leaning deck`;
}

export function getDeckBalanceWarnings(deck = []) {
  if (!deck.length) return ['Select cards to see color balance guidance.'];

  const creatureCount = deck.filter((card) => card.type === 'creature' || card.type === 'Creature').length;
  const spellCount = deck.length - creatureCount;
  const averageCost = getAverageCost(deck);
  const colorAnalysis = analyzeDeckColors(deck);
  const warnings = [];

  if (creatureCount < 8) warnings.push('This deck has very few creatures.');
  if (creatureCount >= 10 && creatureCount <= 14 && spellCount >= 6 && spellCount <= 10) {
    warnings.push('Creature and spell balance looks healthy.');
  }
  if (averageCost > 4.5) warnings.push('This deck has a high average cost.');
  if (colorAnalysis.multicolorCount >= deck.length * 0.45 || colorAnalysis.fiveColorCount >= 3) {
    warnings.push('This deck has many colors, so it may be flexible but slower.');
  }
  if ((colorAnalysis.colorCounts.R + colorAnalysis.colorCounts.W) >= deck.length * 1.05 && creatureCount >= 12) {
    warnings.push('This deck is very aggressive but may struggle defensively.');
  }
  if ((colorAnalysis.colorCounts.U + colorAnalysis.colorCounts.B) >= deck.length * 1.05 && creatureCount < 10) {
    warnings.push('This deck has strong control tools but may win slowly.');
  }
  if (!warnings.length) warnings.push('Color spread and curve look playable.');

  return warnings;
}
