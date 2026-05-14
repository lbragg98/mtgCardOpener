// Dialog for adding collection card references to a binder without moving/deleting the cards.
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
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import CardImage from './CardImage.jsx';
import { FOIL_LABELS, FOIL_TREATMENTS, normalizeFoilTreatment } from '../utils/foilTypes.js';

const RARITY_OPTIONS = ['all', 'common', 'uncommon', 'rare', 'mythic'];
const FOIL_OPTIONS = [
  'all',
  FOIL_TREATMENTS.NONE,
  FOIL_TREATMENTS.RAINBOW,
  FOIL_TREATMENTS.ETCHED,
  FOIL_TREATMENTS.GALAXY,
  FOIL_TREATMENTS.GILDED,
  FOIL_TREATMENTS.TEXTURED,
  FOIL_TREATMENTS.NEON_INK,
];

export default function AddCardsToBinderDialog({
  binder,
  collection = [],
  onAddCards,
  onClose,
  open,
  ownedBinder,
}) {
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('all');
  const [foilTreatment, setFoilTreatment] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const cardsInBinder = useMemo(() => new Set(ownedBinder?.cards || []), [ownedBinder]);
  const availableSlots = Math.max((binder?.capacity || 0) - (ownedBinder?.cards?.length || 0), 0);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return collection.filter((card) => {
      const cardFoilTreatment = normalizeFoilTreatment(card);
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesRarity = rarity === 'all' || card.rarity === rarity;
      const matchesFoil = foilTreatment === 'all' || cardFoilTreatment === foilTreatment;

      return matchesSearch && matchesRarity && matchesFoil;
    });
  }, [collection, foilTreatment, rarity, search]);

  function toggleCard(collectionId) {
    if (cardsInBinder.has(collectionId)) {
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
      <DialogTitle>Add Cards to {binder?.name}</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ mb: 2, mt: 1 }}>
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
          <FormControl sx={{ minWidth: { xs: '100%', md: 170 } }}>
            <InputLabel>Rarity</InputLabel>
            <Select label="Rarity" onChange={(event) => setRarity(event.target.value)} value={rarity}>
              {RARITY_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'all' ? 'All rarities' : option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 210 } }}>
            <InputLabel>Foil</InputLabel>
            <Select label="Foil" onChange={(event) => setFoilTreatment(event.target.value)} value={foilTreatment}>
              {FOIL_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'all' ? 'All treatments' : FOIL_LABELS[option] || option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          <Chip color="warning" label={`${availableSlots} available slot${availableSlots === 1 ? '' : 's'}`} variant="outlined" />
          <Chip label={`${selectedIds.length} selected`} />
          <Chip label={`${filteredCards.length} matching cards`} variant="outlined" />
        </Stack>

        <Grid container spacing={1.5} sx={{ maxHeight: '62vh', overflowY: 'auto', pr: 0.5 }}>
          {filteredCards.map((card) => {
            const alreadyInBinder = cardsInBinder.has(card.collectionId);
            const selected = selectedIds.includes(card.collectionId);
            const disabled = alreadyInBinder || (!selected && selectedIds.length >= availableSlots);

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
                    opacity: alreadyInBinder ? 0.42 : disabled ? 0.6 : 1,
                    transition: 'transform 140ms ease, filter 140ms ease',
                    '&:hover': disabled ? undefined : { transform: 'translateY(-3px)', filter: 'brightness(1.08)' },
                  }}
                >
                  <CardImage card={card} variant="grid" />
                  <Checkbox
                    checked={selected || alreadyInBinder}
                    disabled={disabled}
                    sx={{
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      bgcolor: 'rgba(5, 7, 17, 0.7)',
                      borderRadius: '50%',
                    }}
                  />
                  {alreadyInBinder && (
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
                      In binder
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {!filteredCards.length && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h5">No cards match those filters</Typography>
            <Typography color="text.secondary">Try a different search, rarity, or foil treatment.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button disabled={!selectedIds.length} onClick={handleAddCards} variant="contained">
          Add Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
}
