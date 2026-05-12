import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import CardImage from './CardImage.jsx';

function getDisplayStyle(displayCase) {
  const colors = displayCase?.previewColors || ['#0c101a', '#b9bfd8', '#f8f7ff'];
  return {
    primary: colors[0],
    secondary: colors[1],
    accent: colors[2],
  };
}

export default function DisplayCase({ displayCase, onAddCards, onInspectCard, onRemoveCard }) {
  const style = getDisplayStyle(displayCase);
  const cards = displayCase?.displayCards || [];
  const slots = Array.from({ length: displayCase?.capacity || 3 }, (_, index) => cards[index] || null);

  return (
    <Card
      sx={{
        overflow: 'hidden',
        borderColor: `${style.accent}55`,
        background:
          `radial-gradient(circle at 18% 12%, ${style.accent}22, transparent 22rem), ` +
          `linear-gradient(145deg, ${style.primary}, rgba(5,7,17,0.96))`,
      }}
    >
      <CardContent sx={{ display: 'grid', gap: 2, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 30 } }}>
              {displayCase.name}
            </Typography>
            <Typography color="text.secondary">
              {cards.length} / {displayCase.capacity} cards displayed
            </Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip label={displayCase.rarity} sx={{ textTransform: 'capitalize', fontWeight: 900 }} />
            <Button disabled={cards.length >= displayCase.capacity} onClick={() => onAddCards(displayCase)} startIcon={<AddIcon />} variant="contained">
              Add Cards
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: `repeat(${Math.min(displayCase.capacity, 5)}, minmax(0, 1fr))`,
            },
            gap: { xs: 1.5, md: 2 },
            p: { xs: 1.25, md: 2 },
            border: `1px solid ${style.accent}44`,
            borderRadius: 2,
            background:
              `linear-gradient(135deg, ${style.secondary}20, rgba(255,255,255,0.035)), rgba(0,0,0,0.2)`,
            boxShadow: `inset 0 0 28px rgba(0,0,0,0.3), 0 0 24px ${style.accent}22`,
          }}
        >
          {slots.map((card, index) => (
            <Box
              key={`${displayCase.displayCaseInstanceId}-${index}`}
              sx={{
                position: 'relative',
                display: 'grid',
                minHeight: { xs: 170, sm: 190, md: 220 },
                placeItems: 'center',
                border: `1px solid ${style.accent}44`,
                borderRadius: 1.5,
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015)), rgba(0,0,0,0.18)',
              }}
            >
              {card ? (
                <>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => onInspectCard(card)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onInspectCard(card);
                      }
                    }}
                    sx={{ width: '100%', cursor: 'pointer' }}
                  >
                    <CardImage card={card} variant="grid" />
                  </Box>
                  <IconButton
                    aria-label={`Remove ${card.name} from display case`}
                    onClick={() => onRemoveCard(displayCase, card)}
                    size="small"
                    sx={{
                      position: 'absolute',
                      right: 6,
                      top: 6,
                      bgcolor: 'rgba(5,7,17,0.78)',
                      border: '1px solid rgba(248,247,255,0.16)',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              ) : (
                <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 900 }}>
                  Empty Slot {index + 1}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
