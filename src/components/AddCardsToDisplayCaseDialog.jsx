import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import CardImage from './CardImage.jsx';

export default function AddCardsToDisplayCaseDialog({
  collection = [],
  displayCase,
  onAddCards,
  onClose,
  open,
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const cardsInCase = useMemo(() => new Set(displayCase?.cards || []), [displayCase]);
  const availableSlots = Math.max((displayCase?.capacity || 0) - (displayCase?.cards?.length || 0), 0);
  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return collection.filter((card) => !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch));
  }, [collection, search]);

  function toggleCard(collectionId) {
    if (cardsInCase.has(collectionId)) {
      return;
    }

    setSelectedIds((currentIds) => {
      if (currentIds.includes(collectionId)) {
        return currentIds.filter((id) => id !== collectionId);
      }

      if (currentIds.length >= availableSlots) {
        return currentIds;
      }

      return [...currentIds, collectionId];
    });
  }

  function handleClose() {
    setSelectedIds([]);
    onClose();
  }

  function handleAddCards() {
    onAddCards(selectedIds);
    setSelectedIds([]);
  }

  return (
    <Dialog fullWidth maxWidth="lg" onClose={handleClose} open={open}>
      <DialogTitle>Add cards to {displayCase?.name}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Search collection"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          <Chip color="warning" label={`${availableSlots} available slot${availableSlots === 1 ? '' : 's'}`} variant="outlined" />
          <Chip label={`${selectedIds.length} selected`} />
          <Chip label={`${filteredCards.length} matching cards`} variant="outlined" />
        </Stack>

        <Grid container spacing={1.5} sx={{ maxHeight: '62vh', overflowY: 'auto', pr: 0.5 }}>
          {filteredCards.map((card) => {
            const alreadyInCase = cardsInCase.has(card.collectionId);
            const selected = selectedIds.includes(card.collectionId);
            const disabled = alreadyInCase || (!selected && selectedIds.length >= availableSlots);

            return (
              <Grid key={card.collectionId} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <Box
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => !disabled && toggleCard(card.collectionId)}
                  onKeyDown={(event) => {
                    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      toggleCard(card.collectionId);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: alreadyInCase ? 0.42 : disabled ? 0.6 : 1,
                    transition: 'transform 140ms ease, filter 140ms ease',
                    '&:hover': disabled ? undefined : { transform: 'translateY(-3px)', filter: 'brightness(1.08)' },
                  }}
                >
                  <CardImage card={card} variant="grid" />
                  <Checkbox
                    checked={selected || alreadyInCase}
                    disabled={disabled}
                    sx={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      bgcolor: 'rgba(5, 7, 17, 0.7)',
                      borderRadius: '50%',
                    }}
                  />
                  {alreadyInCase && (
                    <Typography
                      sx={{
                        position: 'absolute',
                        inset: 'auto 6px 8px',
                        borderRadius: 1,
                        bgcolor: 'rgba(5, 7, 17, 0.82)',
                        color: 'warning.main',
                        fontSize: 11,
                        fontWeight: 900,
                        py: 0.5,
                        textAlign: 'center',
                      }}
                    >
                      In case
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {!filteredCards.length && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h5">No matching cards</Typography>
            <Typography color="text.secondary">Try another card name or clear the search.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button disabled={!selectedIds.length} onClick={handleAddCards} variant="contained">
          Add selected cards
        </Button>
      </DialogActions>
    </Dialog>
  );
}
