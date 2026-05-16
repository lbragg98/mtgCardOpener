import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GridViewIcon from '@mui/icons-material/GridView';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { getCardPriceLabel } from '../utils/cardPricing.js';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
import { revealExcitementScore } from '../utils/packGenerator.js';
import CardImage from './CardImage.jsx';
import { OneOfOneRingAtmosphere } from './OneOfOneRingReveal.jsx';

function getHighlights(allCards, boosterType) {
  return [...allCards]
    .filter((card) => {
      const value = Number.parseFloat(card.prices?.usd_foil || card.prices?.usd || card.usd_foil || card.usd || 0);

      return (
        isOneOfOneRing(card) ||
        card.rarity === 'mythic' ||
        card.rarity === 'rare' ||
        card.isFoil ||
        card.isCollectorExclusive ||
        value > 0
      );
    })
    .sort((a, b) => {
      const oneOfOneSort = Number(isOneOfOneRing(b)) - Number(isOneOfOneRing(a));

      if (oneOfOneSort !== 0) {
        return oneOfOneSort;
      }

      return revealExcitementScore(b, boosterType) - revealExcitementScore(a, boosterType);
    })
    .slice(0, 20);
}

export default function BulkPackHighlights({ allCards = [], boosterType = 'play', onContinue }) {
  const highlights = getHighlights(allCards, boosterType);
  const oneOfOneCard = highlights.find(isOneOfOneRing);

  return (
    <Box
      sx={{
        bgcolor: '#03050d',
        minHeight: '100dvh',
        overflow: 'hidden',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
        position: 'relative',
      }}
    >
      {oneOfOneCard && <OneOfOneRingAtmosphere active settled />}
      <Box sx={{ mx: 'auto', maxWidth: 1180, position: 'relative', zIndex: 1 }}>
        <Box sx={{ alignItems: { xs: 'start', sm: 'end' }, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography color="warning.main" fontWeight={950} gutterBottom>
              Bulk reveal
            </Typography>
            <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 34, md: 46 } }}>
              Best Pulls
            </Typography>
          </Box>
          <Button onClick={onContinue} startIcon={<GridViewIcon />} variant="contained">
            View All Pulls
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
            gap: { xs: 1.25, md: 2 },
          }}
        >
          {highlights.map((card, index) => (
            <Card
              key={`${card.id}-${card.packNumber}-${card.bulkCardIndex || index}`}
              component={motion.div}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.45), duration: 0.28 }}
              sx={{
                borderColor: isOneOfOneRing(card)
                  ? 'rgba(244, 201, 93, 0.86)'
                  : card.rarity === 'mythic'
                    ? 'rgba(244, 201, 93, 0.44)'
                    : 'rgba(248, 247, 255, 0.14)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <CardImage card={card} className="bulkCardImage" variant="grid" />
              <CardContent sx={{ display: 'grid', gap: 0.75, p: 1.2 }}>
                <Typography fontWeight={900} noWrap variant="body2">
                  {card.name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip label={`Pack ${card.packNumber || '?'}`} size="small" />
                  {card.rarity === 'mythic' && <Chip color="warning" label="Mythic" size="small" />}
                  {card.isFoil && <Chip color="warning" label={FOIL_LABELS[normalizeFoilTreatment(card)] || 'Foil'} size="small" variant="outlined" />}
                  {card.isCollectorExclusive && (
                    <Chip color="warning" label={isOneOfOneRing(card) ? 'One of One' : 'Collector Exclusive'} size="small" variant="filled" />
                  )}
                </Box>
                <Typography color="text.secondary" variant="caption">
                  {getCardPriceLabel(card)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button onClick={onContinue} size="large" startIcon={<AutoAwesomeIcon />} variant="contained">
            Continue to Summary
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
