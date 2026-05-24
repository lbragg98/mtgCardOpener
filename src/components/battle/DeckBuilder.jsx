import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { COLOR_ORDER } from '../../utils/battleColors.js';

export default function DeckBuilder({ colorAnalysis, deckAnalysis, strategy, warnings = [] }) {
  const percentages = colorAnalysis?.percentages || {};
  const colorCounts = colorAnalysis?.colorCounts || {};

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box>
        <Typography color="text.secondary" variant="caption">Deck strategy</Typography>
        <Typography fontWeight={950}>{strategy}</Typography>
        {colorAnalysis?.topColorStrategy && (
          <Typography color="text.secondary" variant="body2">
            {colorAnalysis.topColorName}: {colorAnalysis.topColorStrategy}
          </Typography>
        )}
      </Box>

      <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
        <Chip label={`${deckAnalysis.creatureCount} creatures`} size="small" variant="outlined" />
        <Chip label={`${deckAnalysis.spellCount} spells`} size="small" variant="outlined" />
        <Chip label={`${deckAnalysis.averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
        {colorAnalysis?.mostCommonColorPair && (
          <Chip label={`${colorAnalysis.mostCommonColorPair} pair`} size="small" color="info" variant="outlined" />
        )}
      </Stack>

      <Box>
        <Typography color="text.secondary" variant="caption">Color identity breakdown</Typography>
        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
          {[...COLOR_ORDER, 'C'].map((color) => (
            <Chip
              key={color}
              label={`${color}: ${colorCounts[color] || 0} (${percentages[color] || 0}%)`}
              size="small"
              variant={(colorCounts[color] || 0) ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      </Box>

      <Stack gap={0.75}>
        {warnings.map((warning) => (
          <Alert
            key={warning}
            severity={warning.includes('healthy') || warning.includes('playable') ? 'success' : 'info'}
            variant="outlined"
          >
            {warning}
          </Alert>
        ))}
      </Stack>
    </Box>
  );
}
