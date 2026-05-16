import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { getDeckStats } from '../../utils/battleDeckValidation.js';

function formatDate(value) {
  if (!value) return 'Not saved yet';

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function SavedDeckCard({ deck, missingCount = 0, onDelete, onLoad, onStart }) {
  const cards = deck?.cards || [];
  const stats = getDeckStats(cards);
  const canBattle = cards.length === 20 && missingCount === 0;

  return (
    <Card className="savedBattleDeckCard" variant="outlined">
      <CardContent sx={{ display: 'grid', gap: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={950} noWrap variant="h6">
              {deck?.name || 'Untitled deck'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Updated {formatDate(deck?.updatedAt || deck?.updated_at)}
            </Typography>
          </Box>
          <Chip color={canBattle ? 'success' : 'warning'} label={`${cards.length}/20 cards`} />
        </Stack>

        <Box className="savedDeckPreviewStrip" aria-label={`${deck?.name || 'Deck'} preview cards`}>
          {cards.slice(0, 6).map((card, index) => (
            <Box
              alt={card.name || 'Saved deck card'}
              className="savedDeckPreviewImage"
              component={card.imageUrl || card.image ? 'img' : 'div'}
              key={`${card.userCardId || card.collectionId || card.name}-${index}`}
              src={card.imageUrl || card.image || undefined}
            >
              {card.imageUrl || card.image ? null : card.name?.slice(0, 18)}
            </Box>
          ))}
        </Box>

        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          <Chip label={`${stats.creatureCount} creatures`} size="small" variant="outlined" />
          <Chip label={`${stats.spellCount} spells`} size="small" variant="outlined" />
          <Chip label={`${stats.averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
          {missingCount > 0 && <Chip color="warning" label={`${missingCount} missing`} size="small" />}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Button onClick={() => onLoad?.(deck)} startIcon={<EditIcon />} variant="outlined">
            Load/Edit
          </Button>
          <Button disabled={!canBattle} onClick={() => onStart?.(deck)} startIcon={<PlayArrowIcon />} variant="contained">
            Start Battle
          </Button>
          <Button color="error" onClick={() => onDelete?.(deck)} startIcon={<DeleteIcon />} variant="outlined">
            Delete
          </Button>
        </Stack>

        {!canBattle && (
          <Typography color="text.secondary" variant="caption">
            {missingCount > 0 ? 'Replace missing cards before battling.' : 'Deck must have 20 cards to battle.'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
