// Deck builder maps the user's real collection into a 20-card simplified battle deck.
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLatestBattleDeck, getCachedBattleDeck, saveBattleDeck } from '../api/battleDecks.js';
import { enrichMissingBattleData } from '../api/enrichCards.js';
import { getMyCards } from '../api/userCards.js';
import BattleCard from '../components/battle/BattleCard.jsx';
import DeckBuilderInsights from '../components/battle/DeckBuilder.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getBattleCardEffectSummary, mapCollectionToBattleCards } from '../utils/battleCardMapper.js';
import { analyzeDeckColors, getDeckBalanceWarnings, getDeckStrategy } from '../utils/deckBalance.js';

const DECK_SIZE = 20;
const RARITY_RANK = {
  common: 1,
  uncommon: 2,
  rare: 3,
  mythic: 4,
};
const TYPE_OPTIONS = [
  { label: 'Creatures', value: 'creature' },
  { label: 'Damage Spells', value: 'damageSpell' },
  { label: 'Drain', value: 'drainSpell' },
  { label: 'Removal', value: 'removalSpell' },
  { label: 'Reanimate', value: 'reanimateSpell' },
  { label: 'Bounce', value: 'bounceSpell' },
  { label: 'Draw', value: 'drawSpell' },
  { label: 'Heal', value: 'healSpell' },
  { label: 'Buff', value: 'buffSpell' },
  { label: 'Debuff', value: 'debuffSpell' },
  { label: 'Tokens', value: 'tokenSpell' },
  { label: 'Discard', value: 'discardSpell' },
  { label: 'Ramp', value: 'rampSpell' },
  { label: 'Artifacts', value: 'artifact' },
  { label: 'Enchantments', value: 'enchantment' },
  { label: 'Planeswalkers', value: 'planeswalker' },
  { label: 'Generic', value: 'genericSpell' },
];

const COLOR_OPTIONS = [
  { label: 'White', value: 'W' },
  { label: 'Blue', value: 'U' },
  { label: 'Black', value: 'B' },
  { label: 'Red', value: 'R' },
  { label: 'Green', value: 'G' },
  { label: 'Colorless', value: 'C' },
  { label: 'Multicolor', value: 'multicolor' },
];

function getEffectSummary(card) {
  return getBattleCardEffectSummary(card);
}

function getColorLabel(card) {
  return card.colorSignature || (card.colorIdentity?.length ? card.colorIdentity.join('') : 'C');
}

function sortBattleCards(cards, sortBy) {
  return [...cards].sort((a, b) => {
    if (sortBy === 'cost') return a.cost - b.cost || a.name.localeCompare(b.name);
    if (sortBy === 'rarity') return (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || a.name.localeCompare(b.name);
    if (sortBy === 'attack') return (b.attack || 0) - (a.attack || 0) || a.name.localeCompare(b.name);
    if (sortBy === 'health') return (b.health || 0) - (a.health || 0) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

function incrementCount(counts, key) {
  return {
    ...counts,
    [key]: (counts[key] || 0) + 1,
  };
}

function getDeckAnalysis(cards) {
  const initialAnalysis = {
    averageCost: 0,
    colorBreakdown: {},
    creatureCount: 0,
    manaCurve: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 },
    rarityBreakdown: {},
    spellCount: 0,
    suggestions: [],
  };

  if (!cards.length) {
    return {
      ...initialAnalysis,
      suggestions: ['Select cards to see deck quality suggestions.'],
    };
  }

  const analysis = cards.reduce((currentAnalysis, card) => {
    const costKey = card.cost >= 6 ? '6+' : String(Math.max(1, card.cost || 1));
    const primaryColor = card.primaryColor || 'C';

    return {
      ...currentAnalysis,
      colorBreakdown: incrementCount(currentAnalysis.colorBreakdown, primaryColor),
      creatureCount: currentAnalysis.creatureCount + (card.type === 'creature' ? 1 : 0),
      manaCurve: incrementCount(currentAnalysis.manaCurve, costKey),
      rarityBreakdown: incrementCount(currentAnalysis.rarityBreakdown, card.rarity || 'common'),
      spellCount: currentAnalysis.spellCount + (card.type === 'creature' ? 0 : 1),
    };
  }, initialAnalysis);
  const averageCost = cards.reduce((total, card) => total + (card.cost || 1), 0) / cards.length;
  const rareMythicCount = (analysis.rarityBreakdown.rare || 0) + (analysis.rarityBreakdown.mythic || 0);
  const expensiveCount = cards.filter((card) => card.cost >= 5).length;
  const suggestions = [];

  if (analysis.creatureCount < 10) suggestions.push('You may want more creatures.');
  if (analysis.creatureCount >= 10 && analysis.creatureCount <= 14 && analysis.spellCount >= 6 && analysis.spellCount <= 10) {
    suggestions.push('You have a good mix of creatures and spells.');
  }
  if (averageCost > 4.5) suggestions.push('Your average cost is high.');
  if (averageCost >= 2.5 && averageCost <= 4.5) suggestions.push('Your average cost is in a solid range.');
  if (rareMythicCount >= 5) suggestions.push('This deck has strong rare/mythic cards.');
  if (expensiveCount >= 7) suggestions.push('Too many expensive cards may slow you down.');
  if (!suggestions.length) suggestions.push('This deck is taking shape. Keep tuning the curve.');

  return {
    ...analysis,
    averageCost,
    suggestions,
  };
}

export default function BattleDeckBuilder() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [battleCards, setBattleCards] = useState([]);
  const [deckId, setDeckId] = useState(null);
  const [deckName, setDeckName] = useState('Binder Battle Deck');
  const [deckVisibility, setDeckVisibility] = useState('private');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    color: 'all',
    colorCombo: 'all',
    cost: 'all',
    foil: 'all',
    rarity: 'all',
    type: 'all',
  });
  const [sortBy, setSortBy] = useState('cost');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingBattleData, setIsRefreshingBattleData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [mobileTab, setMobileTab] = useState('collection');

  useEffect(() => {
    let isMounted = true;

    async function loadDeckBuilder() {
      try {
        setIsLoading(true);
        setError('');
        const [collectionResult, savedDeckResult] = await Promise.allSettled([
          getMyCards(),
          getLatestBattleDeck(),
        ]);

        if (!isMounted) return;

        if (collectionResult.status === 'rejected') {
          throw collectionResult.reason;
        }

        const collection = collectionResult.value;
        const mappedCards = mapCollectionToBattleCards(collection).filter((card) => card.type !== 'land');
        const savedDeck = savedDeckResult.status === 'fulfilled' && savedDeckResult.value
          ? savedDeckResult.value
          : getCachedBattleDeck();
        const savedIds = (savedDeck.cards || []).map((card) => card.userCardId || card.collectionId).filter(Boolean);

        setBattleCards(mappedCards);
        setDeckId(savedDeck.id || null);
        setDeckName(savedDeck.name || 'Binder Battle Deck');
        setDeckVisibility(savedDeck.visibility || 'private');
        setSelectedIds(savedIds);

        if (savedDeckResult.status === 'rejected') {
          setSnackbar('Using local saved deck until Supabase battle decks are available.');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load your battle deck builder.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDeckBuilder();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!battleCards.length) {
      return;
    }

    const availableIds = new Set(battleCards.map((card) => card.userCardId));
    setSelectedIds((currentIds) => currentIds.filter((id) => availableIds.has(id)));
  }, [battleCards]);

  const selectedCards = useMemo(() => {
    const cardById = new Map(battleCards.map((card) => [card.userCardId, card]));
    return selectedIds.map((id) => cardById.get(id)).filter(Boolean);
  }, [battleCards, selectedIds]);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = battleCards.filter((card) => {
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesType = filters.type === 'all' || card.type === filters.type;
      const matchesRarity = filters.rarity === 'all' || card.rarity === filters.rarity;
      const cardColors = Array.isArray(card.colors) && card.colors.length ? card.colors : card.colorIdentity || [];
      const matchesColor = filters.color === 'all' ||
        (filters.color === 'C'
          ? card.colorSignature === 'C' || !card.colorIdentity.length
          : filters.color === 'multicolor'
            ? cardColors.filter((color) => color !== 'C').length > 1
            : cardColors.includes(filters.color));
      const matchesColorCombo = filters.colorCombo === 'all' || card.colorSignature === filters.colorCombo;
      const matchesFoil = filters.foil === 'all' || (filters.foil === 'foil' ? card.isFoil : !card.isFoil);
      const matchesCost = filters.cost === 'all' || (filters.cost === '6+' ? card.cost >= 6 : card.cost === Number(filters.cost));

      return matchesSearch && matchesType && matchesRarity && matchesColor && matchesColorCombo && matchesFoil && matchesCost;
    });

    return sortBattleCards(filtered, sortBy);
  }, [battleCards, filters, search, sortBy]);

  const deckIsReady = selectedCards.length === DECK_SIZE;
  const progressValue = Math.min(100, (selectedCards.length / DECK_SIZE) * 100);
  const deckAnalysis = useMemo(() => getDeckAnalysis(selectedCards), [selectedCards]);
  const deckColorAnalysis = useMemo(() => analyzeDeckColors(selectedCards), [selectedCards]);
  const deckStrategy = useMemo(() => getDeckStrategy(selectedCards), [selectedCards]);
  const deckBalanceWarnings = useMemo(() => getDeckBalanceWarnings(selectedCards), [selectedCards]);
  const colorComboOptions = useMemo(() => {
    const combos = new Map();
    battleCards.forEach((card) => {
      if (card.colorSignature && !combos.has(card.colorSignature)) {
        combos.set(card.colorSignature, card.colorName || card.colorSignature);
      }
    });
    return [...combos.entries()].sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]));
  }, [battleCards]);
  const typeCounts = useMemo(() => battleCards.reduce((counts, card) => ({
    ...counts,
    [card.type]: (counts[card.type] || 0) + 1,
  }), {}), [battleCards]);

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  async function handleRefreshBattleData() {
    try {
      setIsRefreshingBattleData(true);
      const collection = await getMyCards();
      const result = await enrichMissingBattleData(collection);
      const refreshedCollection = await getMyCards();
      const mappedCards = mapCollectionToBattleCards(refreshedCollection).filter((card) => card.type !== 'land');

      setBattleCards(mappedCards);
      setSnackbar(`Updated battle data for ${result.updatedCount} cards.`);
    } catch (refreshError) {
      setSnackbar(refreshError.message || 'Unable to refresh battle data.');
    } finally {
      setIsRefreshingBattleData(false);
    }
  }

  function toggleCard(card) {
    setSelectedIds((currentIds) => {
      if (currentIds.includes(card.userCardId)) {
        return currentIds.filter((id) => id !== card.userCardId);
      }

      if (currentIds.length >= DECK_SIZE) {
        setSnackbar('Deck is full. Remove a card before adding another.');
        return currentIds;
      }

      return [...currentIds, card.userCardId];
    });
  }

  async function handleSaveDeck({ startAfterSave = false } = {}) {
    if (!deckIsReady) {
      setSnackbar('Binder Battle decks must contain exactly 20 cards.');
      return;
    }

    try {
      setIsSaving(true);
      const savedDeck = await saveBattleDeck(selectedCards, { deckId, name: deckName, visibility: deckVisibility });
      setDeckId(savedDeck.id || deckId);
      setDeckVisibility(savedDeck.visibility || deckVisibility);
      setSnackbar(savedDeck.isLocalFallback ? 'Deck saved locally. Supabase save can be retried later.' : 'Battle deck saved to Supabase.');

      if (startAfterSave) {
        navigate('/battle/play');
      }
    } catch (saveError) {
      setSnackbar(saveError.message || 'Unable to save battle deck.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle" variant="outlined" sx={{ mb: 3, minHeight: { xs: 44, sm: 36 } }}>
        Back to Battle
      </Button>
      <PageHeader eyebrow="Binder Battle" title="Deck Builder">
        Build a 20-card battle deck from specific card copies in your Supabase collection.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info" sx={{ mb: 3 }}>Loading your Supabase collection...</Alert>}
      {!isLoading && battleCards.length < DECK_SIZE && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your collection has fewer than 20 cards. Open more packs before building a Binder Battle deck.
        </Alert>
      )}
      {!isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Binder Battle uses automatic mana. Lands are not needed, so lands are excluded from deck building.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
            <TextField
              label="Deck name"
              onChange={(event) => setDeckName(event.target.value)}
              value={deckName}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
              <InputLabel>Visibility</InputLabel>
              <Select
                label="Visibility"
                onChange={(event) => setDeckVisibility(event.target.value)}
                value={deckVisibility}
              >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="friends">Friends</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
              <FormHelperText>Friend-visible decks can be used for friend battles.</FormHelperText>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <Button disabled={!deckIsReady || isSaving} onClick={() => handleSaveDeck()} startIcon={<SaveIcon />} sx={{ minHeight: { xs: 44, sm: 36 } }} variant="outlined">
                Save Deck
              </Button>
              <Button disabled={isRefreshingBattleData || isSaving} onClick={handleRefreshBattleData} startIcon={<RefreshIcon />} sx={{ minHeight: { xs: 44, sm: 36 } }} variant="outlined">
                Refresh Battle Data
              </Button>
              <Button disabled={!deckIsReady || isSaving} onClick={() => handleSaveDeck({ startAfterSave: true })} startIcon={<PlayArrowIcon />} sx={{ minHeight: { xs: 44, sm: 36 } }} variant="contained">
                Start Battle
              </Button>
            </Stack>
          </Stack>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography color="text.secondary" fontWeight={900} variant="body2">
                {selectedCards.length}/{DECK_SIZE} cards
              </Typography>
              <Typography color={deckIsReady ? 'success.main' : 'warning.main'} fontWeight={900} variant="body2">
                {deckIsReady ? 'Ready' : `${DECK_SIZE - selectedCards.length} more needed`}
              </Typography>
            </Stack>
            <LinearProgress color={deckIsReady ? 'success' : 'warning'} value={progressValue} variant="determinate" />
          </Box>
        </CardContent>
      </Card>

      {isMobile && (
        <Tabs
          onChange={(_, value) => setMobileTab(value)}
          sx={{ mb: 2, borderBottom: '1px solid var(--panel-border)' }}
          value={mobileTab}
          variant="fullWidth"
        >
          <Tab label={`Collection (${filteredCards.length})`} value="collection" />
          <Tab label={`Deck (${selectedCards.length}/20)`} value="deck" />
        </Tabs>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }} sx={{ display: isMobile && mobileTab !== 'collection' ? 'none' : 'block' }}>
          <Card>
            <CardContent sx={{ display: 'grid', gap: 2, p: { xs: 1.25, sm: 2 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25}>
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
                <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }}>
                  <InputLabel>Sort</InputLabel>
                  <Select label="Sort" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                    <MenuItem value="cost">Cost</MenuItem>
                    <MenuItem value="rarity">Rarity</MenuItem>
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="attack">Attack</MenuItem>
                    <MenuItem value="health">Health</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: { xs: '100%', md: 190 } }}>
                  <InputLabel>Color Combo</InputLabel>
                  <Select label="Color Combo" onChange={(event) => updateFilter('colorCombo', event.target.value)} value={filters.colorCombo}>
                    <MenuItem value="all">All Combos</MenuItem>
                    {colorComboOptions.map(([signature, name]) => (
                      <MenuItem key={signature} value={signature}>
                        {signature} - {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack
                className="mobileDeckFilterScroller"
                direction="row"
                gap={1}
                sx={{ flexWrap: { xs: 'nowrap', sm: 'wrap' }, overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 0.5, sm: 0 } }}
              >
                {[{ label: 'All Types', value: 'all' }, ...TYPE_OPTIONS].map((type) => (
                  <Chip
                    key={type.value}
                    color={filters.type === type.value ? 'primary' : 'default'}
                    label={type.label}
                    onClick={() => updateFilter('type', type.value)}
                    sx={{ flex: { xs: '0 0 auto', sm: 'initial' } }}
                    variant={filters.type === type.value ? 'filled' : 'outlined'}
                  />
                ))}
                {['all', 'common', 'uncommon', 'rare', 'mythic'].map((rarity) => (
                  <Chip
                    key={rarity}
                    color={filters.rarity === rarity ? 'secondary' : 'default'}
                    label={rarity === 'all' ? 'All Rarities' : rarity}
                    onClick={() => updateFilter('rarity', rarity)}
                    sx={{ flex: { xs: '0 0 auto', sm: 'initial' } }}
                    variant={filters.rarity === rarity ? 'filled' : 'outlined'}
                  />
                ))}
                {COLOR_OPTIONS.map((color) => (
                  <Chip
                    key={color.value}
                    color={filters.color === color.value ? 'warning' : 'default'}
                    label={color.label}
                    onClick={() => updateFilter('color', filters.color === color.value ? 'all' : color.value)}
                    sx={{ flex: { xs: '0 0 auto', sm: 'initial' } }}
                    variant={filters.color === color.value ? 'filled' : 'outlined'}
                  />
                ))}
                {['all', 'foil', 'nonfoil'].map((foil) => (
                  <Chip
                    key={foil}
                    color={filters.foil === foil ? 'success' : 'default'}
                    label={foil === 'all' ? 'All Finishes' : foil}
                    onClick={() => updateFilter('foil', foil)}
                    sx={{ flex: { xs: '0 0 auto', sm: 'initial' } }}
                    variant={filters.foil === foil ? 'filled' : 'outlined'}
                  />
                ))}
                {['all', '1', '2', '3', '4', '5', '6+'].map((cost) => (
                  <Chip
                    key={cost}
                    color={filters.cost === cost ? 'info' : 'default'}
                    label={cost === 'all' ? 'All Costs' : cost}
                    onClick={() => updateFilter('cost', cost)}
                    sx={{ flex: { xs: '0 0 auto', sm: 'initial' } }}
                    variant={filters.cost === cost ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>

              <Divider />

              <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                {TYPE_OPTIONS.filter((type) => typeCounts[type.value]).map((type) => (
                  <Chip key={type.value} label={`${type.label}: ${typeCounts[type.value]}`} size="small" variant="outlined" />
                ))}
              </Stack>

              {!isLoading && !filteredCards.length && (
                <Alert severity="info">No collection cards match those filters.</Alert>
              )}

              <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                {filteredCards.map((card) => (
                  <Grid key={card.userCardId} size={{ xs: 12, sm: 6, xl: 4 }}>
                    <BattleCard
                      card={card}
                      compact
                      disabled={!selectedIds.includes(card.userCardId) && selectedIds.length >= DECK_SIZE}
                      onClick={() => toggleCard(card)}
                      selected={selectedIds.includes(card.userCardId)}
                    />
                    <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5, px: 0.5 }}>
                      {getEffectSummary(card)} - {getColorLabel(card)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: isMobile && mobileTab !== 'deck' ? 'none' : 'block' }}>
          <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
            <CardContent sx={{ display: 'grid', gap: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5">Current Deck</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Specific owned copies selected
                  </Typography>
                </Box>
                <Chip color={deckIsReady ? 'success' : 'warning'} label={`${selectedCards.length}/20`} />
              </Stack>
              <Divider />
              {!selectedCards.length && (
                <Alert severity="info">Select cards from your collection to start building.</Alert>
              )}
              <Card variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.025)' }}>
                <CardContent sx={{ display: 'grid', gap: 1.25, p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography fontWeight={950}>Deck Quality</Typography>
                  <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                    <Chip label={`${deckAnalysis.creatureCount} creatures`} size="small" variant="outlined" />
                    <Chip label={`${deckAnalysis.spellCount} spells`} size="small" variant="outlined" />
                    <Chip label={`${deckAnalysis.averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
                  </Stack>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Mana curve</Typography>
                    <Stack direction="row" gap={0.75} sx={{ alignItems: 'end', mt: 0.75 }}>
                      {Object.entries(deckAnalysis.manaCurve).map(([cost, count]) => (
                        <Box key={cost} sx={{ display: 'grid', flex: 1, gap: 0.5, justifyItems: 'center', minWidth: 0 }}>
                          <Box
                            sx={{
                              bgcolor: 'color-mix(in srgb, var(--accent-color) 55%, transparent)',
                              borderRadius: 1,
                              height: Math.max(8, count * 10),
                              maxHeight: 70,
                              width: '100%',
                            }}
                          />
                          <Typography color="text.secondary" sx={{ fontSize: 11 }}>{cost}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Colors</Typography>
                    <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                      {Object.entries(deckColorAnalysis.signatureCounts).map(([color, count]) => (
                        <Chip key={color} label={`${color}: ${count}`} size="small" />
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">Rarity</Typography>
                    <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                      {Object.entries(deckAnalysis.rarityBreakdown).map(([rarity, count]) => (
                        <Chip key={rarity} label={`${rarity}: ${count}`} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                  <DeckBuilderInsights
                    colorAnalysis={deckColorAnalysis}
                    deckAnalysis={deckAnalysis}
                    strategy={deckStrategy}
                    warnings={[...deckAnalysis.suggestions, ...deckBalanceWarnings]}
                  />
                </CardContent>
              </Card>
              <Stack gap={1} sx={{ maxHeight: { lg: '66vh' }, overflow: 'auto', pr: { lg: 0.5 } }}>
                {selectedCards.map((card, index) => (
                  <Card key={`${card.userCardId}-${index}`} variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.025)' }}>
                    <CardContent sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, p: 1.25, '&:last-child': { pb: 1.25 } }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={950} noWrap variant="body2">
                          {index + 1}. {card.name}
                        </Typography>
                        <Typography color="text.secondary" noWrap variant="caption">
                          {card.type} - Cost {card.cost} - {getEffectSummary(card)}
                        </Typography>
                      </Box>
                      <IconButton aria-label={`Remove ${card.name}`} onClick={() => toggleCard(card)} size="small" sx={{ minHeight: { xs: 44, sm: 34 }, minWidth: { xs: 44, sm: 34 } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isMobile && (
        <Box className="mobileDeckBuilderActionBar">
          <Chip color={deckIsReady ? 'success' : 'warning'} label={`${selectedCards.length}/20`} />
          <Button disabled={!deckIsReady || isSaving} onClick={() => handleSaveDeck({ startAfterSave: true })} sx={{ minHeight: 44 }} variant="contained">
            Start Battle
          </Button>
        </Box>
      )}

      <Snackbar autoHideDuration={3600} onClose={() => setSnackbar('')} open={Boolean(snackbar)} message={snackbar} />
    </Box>
  );
}
