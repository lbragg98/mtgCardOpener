import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import StyleIcon from '@mui/icons-material/Style';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { clearCollection, getCollection, removeCardFromCollection } from '../utils/collectionStorage.js';

const ALL_FILTER = 'all';
const SORT_OPTIONS = {
  newest: 'newest',
  oldest: 'oldest',
  name: 'name',
  rarity: 'rarity',
};

const RARITY_ORDER = {
  mythic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

function sortOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatOpenedDate(date) {
  if (!date) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function Collection() {
  const [collection, setCollection] = useState([]);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState(ALL_FILTER);
  const [setFilter, setSetFilter] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.newest);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    setCollection(getCollection());
  }, []);

  const rarityOptions = useMemo(() => sortOptions(collection.map((card) => card.rarity)), [collection]);
  const setOptions = useMemo(() => sortOptions(collection.map((card) => card.set)), [collection]);
  const duplicateCounts = useMemo(() => {
    return collection.reduce((counts, card) => {
      counts[card.id] = (counts[card.id] || 0) + 1;
      return counts;
    }, {});
  }, [collection]);

  const filteredCollection = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filteredCards = collection.filter((card) => {
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesRarity = rarityFilter === ALL_FILTER || card.rarity === rarityFilter;
      const matchesSet = setFilter === ALL_FILTER || card.set === setFilter;

      return matchesSearch && matchesRarity && matchesSet;
    });

    return [...filteredCards].sort((a, b) => {
      if (sortBy === SORT_OPTIONS.oldest) {
        return new Date(a.openedAt) - new Date(b.openedAt);
      }

      if (sortBy === SORT_OPTIONS.name) {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === SORT_OPTIONS.rarity) {
        return (RARITY_ORDER[a.rarity] || 99) - (RARITY_ORDER[b.rarity] || 99) || a.name.localeCompare(b.name);
      }

      return new Date(b.openedAt) - new Date(a.openedAt);
    });
  }, [collection, rarityFilter, search, setFilter, sortBy]);

  function handleClearCollection() {
    if (window.confirm('Clear your entire collection from this browser?')) {
      clearCollection();
      setCollection([]);
      setRarityFilter(ALL_FILTER);
      setSetFilter(ALL_FILTER);
      setSearch('');
      setSelectedCard(null);
    }
  }

  function handleRemoveCard(collectionId) {
    const nextCollection = removeCardFromCollection(collectionId);
    setCollection(nextCollection);
    setSelectedCard((card) => (card?.collectionId === collectionId ? null : card));
  }

  return (
    <Box>
      <PageHeader eyebrow="Collection" title="Your saved cards">
        Cards are saved locally after a full pack reveal. Duplicate copies are tracked separately.
      </PageHeader>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography color="warning.main" fontWeight={900}>
          Total cards: {collection.length}
        </Typography>
        <Button
          color="error"
          disabled={collection.length === 0}
          onClick={handleClearCollection}
          startIcon={<DeleteIcon />}
          variant="outlined"
        >
          Clear Collection
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 4,
        }}
      >
        <TextField
          fullWidth
          label="Search cards"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="secondary" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth>
          <InputLabel id="rarity-filter-label">Rarity</InputLabel>
          <Select
            label="Rarity"
            labelId="rarity-filter-label"
            onChange={(event) => setRarityFilter(event.target.value)}
            value={rarityFilter}
          >
            <MenuItem value={ALL_FILTER}>All rarities</MenuItem>
            {rarityOptions.map((rarity) => (
              <MenuItem key={rarity} value={rarity}>
                {rarity}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="set-filter-label">Set</InputLabel>
          <Select
            label="Set"
            labelId="set-filter-label"
            onChange={(event) => setSetFilter(event.target.value)}
            value={setFilter}
          >
            <MenuItem value={ALL_FILTER}>All sets</MenuItem>
            {setOptions.map((setCode) => (
              <MenuItem key={setCode} value={setCode}>
                {setCode.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="sort-label">Sort</InputLabel>
          <Select
            label="Sort"
            labelId="sort-label"
            onChange={(event) => setSortBy(event.target.value)}
            value={sortBy}
          >
            <MenuItem value={SORT_OPTIONS.newest}>Newest first</MenuItem>
            <MenuItem value={SORT_OPTIONS.oldest}>Oldest first</MenuItem>
            <MenuItem value={SORT_OPTIONS.name}>Name A-Z</MenuItem>
            <MenuItem value={SORT_OPTIONS.rarity}>Rarity</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {collection.length === 0 && (
        <Card sx={{ textAlign: 'center', py: { xs: 5, md: 7 }, px: 3 }}>
          <CardContent>
            <StyleIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Your collection is empty
            </Typography>
            <Typography color="text.secondary" sx={{ mx: 'auto', mb: 3, maxWidth: 520 }}>
              Open a pack all the way through and the cards will be saved here automatically.
            </Typography>
            <Button component={Link} to="/sets" variant="contained">
              Open Packs
            </Button>
          </CardContent>
        </Card>
      )}

      {collection.length > 0 && filteredCollection.length === 0 && (
        <Alert severity="info">No cards match those filters.</Alert>
      )}

      {filteredCollection.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          {filteredCollection.map((card) => (
            <Card
              key={card.collectionId}
              className={card.isFoil ? 'foil-card' : ''}
              onClick={() => setSelectedCard(card)}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                minWidth: 0,
                cursor: 'pointer',
              }}
            >
              {duplicateCounts[card.id] > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: 'rgba(5, 7, 17, 0.84)',
                    border: '1px solid rgba(244, 201, 93, 0.45)',
                    color: 'warning.main',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  x{duplicateCounts[card.id]}
                </Box>
              )}
              <Box
                component="img"
                src={card.imageUrl}
                alt={card.name}
                sx={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '488 / 680',
                  objectFit: 'contain',
                  bgcolor: 'rgba(0, 0, 0, 0.32)',
                }}
              />
              <CardContent sx={{ p: 1.25 }}>
                <Typography variant="body2" fontWeight={900} noWrap>
                  {card.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {card.isFoil ? 'Foil ' : ''}
                  {card.rarity} - {card.set?.toUpperCase()} #{card.collector_number}
                </Typography>
                <Button
                  color="error"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveCard(card.collectionId);
                  }}
                  size="small"
                  sx={{ mt: 1 }}
                  variant="text"
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        fullWidth
        maxWidth="md"
        onClose={() => setSelectedCard(null)}
        open={Boolean(selectedCard)}
      >
        {selectedCard && (
          <>
            <DialogTitle>{selectedCard.name}</DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 360px) 1fr' },
                  gap: 3,
                  alignItems: 'start',
                }}
              >
                <Box
                  className={selectedCard.isFoil ? 'foil-card' : ''}
                  sx={{ position: 'relative', overflow: 'hidden', borderRadius: 3 }}
                >
                  <Box
                    component="img"
                    src={selectedCard.imageUrl}
                    alt={selectedCard.name}
                    sx={{ display: 'block', width: '100%' }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Typography>
                    <strong>Rarity:</strong> {selectedCard.rarity}
                  </Typography>
                  <Typography>
                    <strong>Set:</strong> {selectedCard.set_name || selectedCard.set?.toUpperCase()}
                  </Typography>
                  <Typography>
                    <strong>Collector number:</strong> {selectedCard.collector_number}
                  </Typography>
                  <Typography>
                    <strong>Foil:</strong> {selectedCard.isFoil ? 'Yes' : 'No'}
                  </Typography>
                  <Typography>
                    <strong>Opened:</strong> {formatOpenedDate(selectedCard.openedAt)}
                  </Typography>
                  <Typography>
                    <strong>Copies owned:</strong> {duplicateCounts[selectedCard.id] || 1}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
                    <Button color="error" onClick={() => handleRemoveCard(selectedCard.collectionId)} variant="outlined">
                      Remove this copy
                    </Button>
                    <Button onClick={() => setSelectedCard(null)} variant="contained">
                      Close
                    </Button>
                  </Box>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
