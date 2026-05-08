import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StyleIcon from '@mui/icons-material/Style';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CardInspectionDialog from '../components/CardInspectionDialog.jsx';
import CardImage from '../components/CardImage.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatPrice, getCardPrice, getCardPriceLabel, getCollectionValue } from '../utils/cardPricing.js';
import { clearCollection, getCollection, getPackShards, recycleCard } from '../utils/collectionStorage.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
import { refreshCollectionPrices } from '../utils/priceRefresh.js';

const ALL_FILTER = 'all';
const SORT_OPTIONS = {
  newest: 'newest',
  oldest: 'oldest',
  name: 'name',
  rarity: 'rarity',
  valueHigh: 'valueHigh',
  valueLow: 'valueLow',
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

export default function Collection() {
  const [collection, setCollection] = useState([]);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState(ALL_FILTER);
  const [setFilter, setSetFilter] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.newest);
  const [selectedCard, setSelectedCard] = useState(null);
  const [packShards, setPackShards] = useState(() => getPackShards());
  const [cardToRecycle, setCardToRecycle] = useState(null);
  const [isRecycling, setIsRecycling] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [recycleMessage, setRecycleMessage] = useState('');
  const [recycleSeverity, setRecycleSeverity] = useState('success');

  useEffect(() => {
    setCollection(getCollection());
  }, []);

  useEffect(() => {
    function refreshLocalState() {
      setPackShards(getPackShards());
      setCollection(getCollection());
    }

    window.addEventListener('packShardsUpdated', refreshLocalState);
    window.addEventListener('collectionUpdated', refreshLocalState);
    window.addEventListener('storage', refreshLocalState);

    return () => {
      window.removeEventListener('packShardsUpdated', refreshLocalState);
      window.removeEventListener('collectionUpdated', refreshLocalState);
      window.removeEventListener('storage', refreshLocalState);
    };
  }, []);

  const rarityOptions = useMemo(() => sortOptions(collection.map((card) => card.rarity)), [collection]);
  const setOptions = useMemo(() => sortOptions(collection.map((card) => card.set)), [collection]);
  const duplicateCounts = useMemo(() => {
    return collection.reduce((counts, card) => {
      counts[card.id] = (counts[card.id] || 0) + 1;
      return counts;
    }, {});
  }, [collection]);
  const duplicateCopyCount = useMemo(() => {
    return Object.values(duplicateCounts).reduce((total, count) => total + Math.max(0, count - 1), 0);
  }, [duplicateCounts]);
  const totalCollectionValue = useMemo(() => getCollectionValue(collection), [collection]);
  const foilCollectionValue = useMemo(
    () => collection.filter((card) => card.isFoil).reduce((total, card) => total + getCardPrice(card), 0),
    [collection],
  );
  const uniqueCardCount = useMemo(() => new Set(collection.map((card) => card.id)).size, [collection]);

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

      if (sortBy === SORT_OPTIONS.valueHigh) {
        return getCardPrice(b) - getCardPrice(a) || a.name.localeCompare(b.name);
      }

      if (sortBy === SORT_OPTIONS.valueLow) {
        return getCardPrice(a) - getCardPrice(b) || a.name.localeCompare(b.name);
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

  function requestRecycle(card) {
    setCardToRecycle(card);
  }

  function closeRecycleDialog() {
    if (!isRecycling) {
      setCardToRecycle(null);
    }
  }

  function handleRecycleCard() {
    if (!cardToRecycle || isRecycling) {
      return;
    }

    setIsRecycling(true);

    try {
      const result = recycleCard(cardToRecycle.collectionId);

      setCollection(result.updatedCollection);
      setPackShards(result.newShardBalance);
      setSelectedCard((card) => (card?.collectionId === cardToRecycle.collectionId ? null : card));
      setCardToRecycle(null);
      setRecycleSeverity('success');
      setRecycleMessage('Card recycled for 25 Pack Shards.');
    } catch (error) {
      setRecycleSeverity('error');
      setRecycleMessage(error.message || 'Unable to recycle that card.');
    } finally {
      setIsRecycling(false);
    }
  }

  async function handleRefreshPrices() {
    if (collection.length === 0 || isRefreshingPrices) {
      return;
    }

    setIsRefreshingPrices(true);

    try {
      const result = await refreshCollectionPrices(collection);

      setCollection(result.updatedCollection);
      setSelectedCard((card) =>
        card ? result.updatedCollection.find((updatedCard) => updatedCard.collectionId === card.collectionId) || card : null,
      );
      setRecycleSeverity(result.failedCount > 0 ? 'warning' : 'success');
      setRecycleMessage(
        result.failedCount > 0
          ? `Updated ${result.updatedCount} cards. ${result.failedCount} could not be refreshed.`
          : `Updated prices for ${result.updatedCount} cards.`,
      );
    } catch (error) {
      setRecycleSeverity('error');
      setRecycleMessage(error.message || 'Unable to refresh prices right now.');
    } finally {
      setIsRefreshingPrices(false);
    }
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
        <Chip
          color="warning"
          label={`${packShards.toLocaleString()} pack shards`}
          sx={{ fontWeight: 900 }}
          variant="outlined"
        />
        <Chip
          color="secondary"
          label={`${duplicateCopyCount.toLocaleString()} duplicate ${duplicateCopyCount === 1 ? 'copy' : 'copies'}`}
          sx={{ fontWeight: 900 }}
          variant="outlined"
        />
        <Button
          disabled={collection.length === 0 || isRefreshingPrices}
          onClick={handleRefreshPrices}
          startIcon={<RefreshIcon />}
          variant="outlined"
        >
          {isRefreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
        </Button>
        <Button
          color="error"
          disabled={collection.length === 0 || isRefreshingPrices}
          onClick={handleClearCollection}
          startIcon={<DeleteIcon />}
          variant="outlined"
        >
          Clear Collection
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} variant="outlined">
        Duplicate cards reward 100 Pack Shards when they are opened. Foil and non-foil copies count separately.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {[
          { label: 'Total Estimated Value', value: formatPrice(totalCollectionValue), helper: 'Scryfall market data' },
          { label: 'Total Cards', value: collection.length.toLocaleString(), helper: 'Saved locally' },
          { label: 'Unique Cards', value: uniqueCardCount.toLocaleString(), helper: 'By Scryfall card ID' },
          { label: 'Foil Value', value: formatPrice(foilCollectionValue), helper: 'Foil copies only' },
        ].map((stat) => (
          <Card key={stat.label} sx={{ borderColor: 'rgba(244, 201, 93, 0.24)' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
                {stat.label}
              </Typography>
              <Typography color="warning.main" fontWeight={950} sx={{ fontSize: { xs: 20, sm: 24 } }}>
                {stat.value}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                {stat.helper}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Typography color="text.secondary" sx={{ mb: 3, fontSize: 12 }}>
        Prices are estimates from Scryfall and may be missing or outdated.
      </Typography>

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
            <MenuItem value={SORT_OPTIONS.valueHigh}>Value high to low</MenuItem>
            <MenuItem value={SORT_OPTIONS.valueLow}>Value low to high</MenuItem>
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
              <CardImage card={card} variant="grid" />
              <CardContent sx={{ p: 1.25 }}>
                <Typography variant="body2" fontWeight={900} noWrap>
                  {card.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {card.rarity} - {card.set?.toUpperCase()} #{card.collector_number}
                </Typography>
                <Typography color={getCardPrice(card) ? 'warning.main' : 'text.secondary'} fontWeight={900} sx={{ mt: 0.5 }}>
                  {getCardPrice(card) ? getCardPriceLabel(card) : 'No price'}
                </Typography>
                {card.isFoil && (
                  <Chip
                    color="warning"
                    label={FOIL_LABELS[normalizeFoilTreatment(card)]}
                    size="small"
                    sx={{ mt: 0.75, maxWidth: '100%', fontWeight: 900 }}
                  />
                )}
                <Button
                  color="error"
                  onClick={(event) => {
                    event.stopPropagation();
                    requestRecycle(card);
                  }}
                  size="small"
                  sx={{ mt: 1 }}
                  variant="outlined"
                >
                  Recycle
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <CardInspectionDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onRecycle={requestRecycle}
        open={Boolean(selectedCard)}
        sourceContext="collection"
      />

      <Dialog fullWidth maxWidth="xs" onClose={closeRecycleDialog} open={Boolean(cardToRecycle)}>
        <DialogTitle>Recycle card?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will remove {cardToRecycle?.name || 'this card'} from your collection and grant 25 Pack Shards.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button disabled={isRecycling} onClick={closeRecycleDialog} variant="outlined">
            Cancel
          </Button>
          <Button color="warning" disabled={isRecycling} onClick={handleRecycleCard} variant="contained">
            Recycle for 25 Shards
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={3600}
        onClose={() => setRecycleMessage('')}
        open={Boolean(recycleMessage)}
      >
        <Alert severity={recycleSeverity} variant="filled" sx={{ width: '100%' }}>
          {recycleMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
