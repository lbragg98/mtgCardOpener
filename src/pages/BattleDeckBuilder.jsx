// Deck builder maps the user's real collection into saved 20-card Binder Battle decks.
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Divider,
  Drawer,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteBattleDeck,
  getMyBattleDecks,
  saveBattleDeck,
  serializeBattleDeckCard,
} from '../api/battleDecks.js';
import { enrichMissingBattleData } from '../api/enrichCards.js';
import { getMyCards } from '../api/userCards.js';
import BattleCard from '../components/battle/BattleCard.jsx';
import DeckBuilderInsights from '../components/battle/DeckBuilder.jsx';
import SavedDeckCard from '../components/battle/SavedDeckCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getBattleCardEffectSummary, mapCollectionToBattleCards } from '../utils/battleCardMapper.js';
import { saveBattleDeck as saveActiveBattleDeck } from '../utils/battleDeckStorage.js';
import { getDeckCardId, getDeckStats, getMissingDeckCards } from '../utils/battleDeckValidation.js';
import { analyzeDeckColors, getDeckBalanceWarnings, getDeckStrategy } from '../utils/deckBalance.js';

const DECK_SIZE = 20;
const DEFAULT_DECK_NAME = 'New Battle Deck';
const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, mythic: 4 };

const FILTER_GROUPS = [
  {
    key: 'type',
    title: 'Card Type',
    options: [
      ['all', 'All'],
      ['creature', 'Creatures'],
      ['spell', 'Spells'],
      ['damage', 'Damage'],
      ['heal', 'Heal'],
      ['draw', 'Draw'],
      ['buff', 'Buff'],
      ['removal', 'Removal'],
      ['tokens', 'Tokens'],
    ],
  },
  {
    key: 'rarity',
    title: 'Rarity',
    options: [
      ['all', 'All'],
      ['common', 'Common'],
      ['uncommon', 'Uncommon'],
      ['rare', 'Rare'],
      ['mythic', 'Mythic'],
    ],
  },
  {
    key: 'color',
    title: 'Colors',
    options: [
      ['all', 'All'],
      ['W', 'White'],
      ['U', 'Blue'],
      ['B', 'Black'],
      ['R', 'Red'],
      ['G', 'Green'],
      ['C', 'Colorless'],
      ['multicolor', 'Multicolor'],
    ],
  },
  {
    key: 'foil',
    title: 'Foil',
    options: [
      ['all', 'All'],
      ['foil', 'Foils'],
      ['nonfoil', 'Non-foils'],
    ],
  },
  {
    key: 'cost',
    title: 'Mana Cost',
    options: [
      ['all', 'All'],
      ['1-', '1 or less'],
      ['2', '2'],
      ['3', '3'],
      ['4', '4'],
      ['5+', '5+'],
      ['7+', '7+'],
    ],
  },
  {
    key: 'status',
    title: 'Deck Status',
    options: [
      ['all', 'All Cards'],
      ['inDeck', 'In Deck'],
      ['notInDeck', 'Not In Deck'],
      ['playableCreatures', 'Playable Creatures'],
      ['playableSpells', 'Playable Spells'],
    ],
  },
];

const INITIAL_FILTERS = {
  color: 'all',
  cost: 'all',
  foil: 'all',
  rarity: 'all',
  status: 'all',
  type: 'all',
};

function getEffectSummary(card) {
  return card?.effectSummary || getBattleCardEffectSummary(card);
}

function getColorLabel(card) {
  return card.colorSignature || (card.colorIdentity?.length ? card.colorIdentity.join('') : 'C');
}

function getCardDate(card) {
  return new Date(card.openedAt || card.created_at || card.createdAt || 0).getTime();
}

function sortBattleCards(cards, sortBy) {
  return [...cards].sort((a, b) => {
    if (sortBy === 'costAsc') return (a.cost || 1) - (b.cost || 1) || a.name.localeCompare(b.name);
    if (sortBy === 'costDesc') return (b.cost || 1) - (a.cost || 1) || a.name.localeCompare(b.name);
    if (sortBy === 'rarity') return (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || a.name.localeCompare(b.name);
    if (sortBy === 'attack') return (b.attack || 0) - (a.attack || 0) || a.name.localeCompare(b.name);
    if (sortBy === 'health') return (b.health || 0) - (a.health || 0) || a.name.localeCompare(b.name);
    if (sortBy === 'recent') return getCardDate(b) - getCardDate(a) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

function matchesTypeFilter(card, value) {
  if (value === 'all') return true;
  if (value === 'creature') return card.type === 'creature';
  if (value === 'spell') return card.type !== 'creature';
  if (value === 'damage') return ['damageSpell', 'drainSpell'].includes(card.type);
  if (value === 'heal') return card.type === 'healSpell';
  if (value === 'draw') return card.type === 'drawSpell';
  if (value === 'buff') return ['buffSpell', 'shieldSpell'].includes(card.type);
  if (value === 'removal') return ['removalSpell', 'bounceSpell', 'debuffSpell'].includes(card.type);
  if (value === 'tokens') return card.type === 'tokenSpell';
  return card.type === value;
}

function matchesCostFilter(card, value) {
  const cost = card.cost || 1;
  if (value === 'all') return true;
  if (value === '1-') return cost <= 1;
  if (value === '5+') return cost >= 5;
  if (value === '7+') return cost >= 7;
  return cost === Number(value);
}

function matchesColorFilter(card, value) {
  const colors = Array.isArray(card.colors) && card.colors.length ? card.colors : card.colorIdentity || [];
  if (value === 'all') return true;
  if (value === 'C') return card.colorSignature === 'C' || !colors.length || colors.every((color) => color === 'C');
  if (value === 'multicolor') return colors.filter((color) => color !== 'C').length > 1;
  return colors.includes(value);
}

function getDeckFingerprint({ cards, name, visibility }) {
  return JSON.stringify({
    cards: (cards || []).map((card) => getDeckCardId(card)),
    name: String(name || '').trim(),
    visibility,
  });
}

function formatStartMessage(count, missingCount) {
  if (missingCount > 0) return 'Replace missing cards before starting.';
  if (count === DECK_SIZE) return 'Ready to battle';
  return `Add ${DECK_SIZE - count} more card${DECK_SIZE - count === 1 ? '' : 's'} to start.`;
}

export default function BattleDeckBuilder() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState('build');
  const [battleCards, setBattleCards] = useState([]);
  const [currentEditingDeckId, setCurrentEditingDeckId] = useState(null);
  const [deckName, setDeckName] = useState(DEFAULT_DECK_NAME);
  const [deckVisibility, setDeckVisibility] = useState('private');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingBattleData, setIsRefreshingBattleData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedSavedCardsById, setLoadedSavedCardsById] = useState(new Map());
  const [mobileBuildView, setMobileBuildView] = useState('collection');
  const [savedDecks, setSavedDecks] = useState([]);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState('costAsc');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const cardById = useMemo(() => new Map(battleCards.map((card) => [getDeckCardId(card), card])), [battleCards]);
  const selectedCards = useMemo(() => selectedIds.map((id) => cardById.get(id)).filter(Boolean), [cardById, selectedIds]);
  const missingDeckCards = useMemo(
    () => selectedIds.filter((id) => !cardById.has(id)).map((id) => loadedSavedCardsById.get(id)).filter(Boolean),
    [cardById, loadedSavedCardsById, selectedIds],
  );
  const currentDeckCards = useMemo(
    () => selectedIds.map((id) => cardById.get(id) || loadedSavedCardsById.get(id)).filter(Boolean),
    [cardById, loadedSavedCardsById, selectedIds],
  );
  const deckStats = useMemo(() => getDeckStats(currentDeckCards), [currentDeckCards]);
  const deckIsReady = currentDeckCards.length === DECK_SIZE && missingDeckCards.length === 0;
  const progressValue = Math.min(100, (currentDeckCards.length / DECK_SIZE) * 100);
  const deckColorAnalysis = useMemo(() => analyzeDeckColors(selectedCards), [selectedCards]);
  const deckStrategy = useMemo(() => getDeckStrategy(selectedCards), [selectedCards]);
  const deckBalanceWarnings = useMemo(() => getDeckBalanceWarnings(selectedCards), [selectedCards]);
  const currentFingerprint = useMemo(
    () => getDeckFingerprint({ cards: currentDeckCards, name: deckName, visibility: deckVisibility }),
    [currentDeckCards, deckName, deckVisibility],
  );
  const hasUnsavedChanges = Boolean(savedFingerprint) && currentFingerprint !== savedFingerprint;
  const deckNameError = !deckName.trim();

  const activeFilterCount = useMemo(() => (
    Object.values(filters).filter((value) => value !== 'all').length + (search.trim() ? 1 : 0)
  ), [filters, search]);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const selectedIdSet = new Set(selectedIds);
    const filtered = battleCards.filter((card) => {
      const cardId = getDeckCardId(card);
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesType = matchesTypeFilter(card, filters.type);
      const matchesRarity = filters.rarity === 'all' || card.rarity === filters.rarity;
      const matchesColor = matchesColorFilter(card, filters.color);
      const matchesFoil = filters.foil === 'all' || (filters.foil === 'foil' ? card.isFoil : !card.isFoil);
      const matchesCost = matchesCostFilter(card, filters.cost);
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'inDeck' && selectedIdSet.has(cardId)) ||
        (filters.status === 'notInDeck' && !selectedIdSet.has(cardId)) ||
        (filters.status === 'playableCreatures' && card.type === 'creature') ||
        (filters.status === 'playableSpells' && card.type !== 'creature');

      return matchesSearch && matchesType && matchesRarity && matchesColor && matchesFoil && matchesCost && matchesStatus;
    });

    return sortBattleCards(filtered, sortBy);
  }, [battleCards, filters, search, selectedIds, sortBy]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeckBuilder() {
      try {
        setIsLoading(true);
        setError('');
        const [collection, decks] = await Promise.all([getMyCards(), getMyBattleDecks()]);

        if (!isMounted) return;

        const mappedCards = mapCollectionToBattleCards(collection).filter((card) => card.type !== 'land');
        setBattleCards(mappedCards);
        setSavedDecks(decks);

        if (decks[0]) {
          loadDeckIntoBuilder(decks[0], mappedCards, { announce: false, confirmUnsaved: false });
        } else {
          const fingerprint = getDeckFingerprint({ cards: [], name: DEFAULT_DECK_NAME, visibility: 'private' });
          setDeckName(DEFAULT_DECK_NAME);
          setDeckVisibility('private');
          setSelectedIds([]);
          setLoadedSavedCardsById(new Map());
          setSavedFingerprint(fingerprint);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'The battle deck builder could not be loaded. Please try again.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDeckBuilder();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setSearch('');
  }

  async function refreshSavedDecks() {
    const decks = await getMyBattleDecks();
    setSavedDecks(decks);
    return decks;
  }

  function loadDeckIntoBuilder(deck, availableCards = battleCards, { announce = true, confirmUnsaved = true } = {}) {
    if (confirmUnsaved && hasUnsavedChanges && !window.confirm('You have unsaved changes. Load a different deck?')) {
      return;
    }

    const availableIds = new Set(availableCards.map(getDeckCardId));
    const savedCardsById = new Map();
    const ids = (deck.cards || []).map((card) => {
      const id = getDeckCardId(card);
      if (id && !availableIds.has(id)) savedCardsById.set(id, card);
      return id;
    }).filter(Boolean);
    const nextCards = ids.map((id) => availableCards.find((card) => getDeckCardId(card) === id) || savedCardsById.get(id)).filter(Boolean);
    const nextName = deck.name || DEFAULT_DECK_NAME;
    const nextVisibility = deck.visibility || 'private';

    setCurrentEditingDeckId(deck.id || null);
    setDeckName(nextName);
    setDeckVisibility(nextVisibility);
    setLoadedSavedCardsById(savedCardsById);
    setSelectedIds(ids);
    setSavedFingerprint(getDeckFingerprint({ cards: nextCards, name: nextName, visibility: nextVisibility }));
    setActiveTab('build');
    setMobileBuildView('collection');

    if (announce) {
      setSnackbar(`Loaded ${nextName}.`);
    }
  }

  function startDeck(cards) {
    if (cards.length !== DECK_SIZE) {
      setSnackbar('Deck must have 20 cards to battle.');
      return;
    }

    const missing = getMissingDeckCards({ cards }, battleCards);
    if (missing.length) {
      setSnackbar('Some cards in this deck are no longer in your collection.');
      return;
    }

    saveActiveBattleDeck(cards.map(serializeBattleDeckCard));
    navigate('/battle/play');
  }

  async function handleRefreshBattleData() {
    try {
      setIsRefreshingBattleData(true);
      const collection = await getMyCards();
      const result = await enrichMissingBattleData(collection);
      const refreshedCollection = await getMyCards();
      const mappedCards = mapCollectionToBattleCards(refreshedCollection).filter((card) => card.type !== 'land');

      setBattleCards(mappedCards);
      setSnackbar(`Updated battle data for ${result.updatedCount} card${result.updatedCount === 1 ? '' : 's'}.`);
    } catch (refreshError) {
      setSnackbar(refreshError.message || 'Battle data could not be refreshed. Please try again.');
    } finally {
      setIsRefreshingBattleData(false);
    }
  }

  function toggleCard(card) {
    const cardId = getDeckCardId(card);
    setSelectedIds((currentIds) => {
      if (currentIds.includes(cardId)) {
        return currentIds.filter((id) => id !== cardId);
      }

      if (currentIds.length >= DECK_SIZE) {
        setSnackbar('Deck is full. Remove a card before adding another.');
        return currentIds;
      }

      return [...currentIds, cardId];
    });
  }

  function removeMissingCard(card) {
    const cardId = getDeckCardId(card);
    setSelectedIds((currentIds) => currentIds.filter((id) => id !== cardId));
    setLoadedSavedCardsById((currentMap) => {
      const nextMap = new Map(currentMap);
      nextMap.delete(cardId);
      return nextMap;
    });
  }

  function handleClearDeck() {
    if (hasUnsavedChanges && !window.confirm('Clear this deck and discard unsaved changes?')) {
      return;
    }

    const fingerprint = getDeckFingerprint({ cards: [], name: DEFAULT_DECK_NAME, visibility: 'private' });
    setCurrentEditingDeckId(null);
    setDeckName(DEFAULT_DECK_NAME);
    setDeckVisibility('private');
    setLoadedSavedCardsById(new Map());
    setSelectedIds([]);
    setSavedFingerprint(fingerprint);
    setSnackbar('Deck cleared.');
  }

  async function handleSaveDeck() {
    if (deckNameError) {
      setSnackbar('Give your deck a name before saving.');
      return;
    }

    try {
      setIsSaving(true);
      const savedDeck = await saveBattleDeck({
        cards: currentDeckCards,
        id: currentEditingDeckId,
        name: deckName.trim(),
        visibility: deckVisibility,
      });

      setCurrentEditingDeckId(savedDeck.id || currentEditingDeckId);
      setDeckName(savedDeck.name || deckName.trim());
      setDeckVisibility(savedDeck.visibility || deckVisibility);
      setSavedFingerprint(getDeckFingerprint({
        cards: savedDeck.cards || currentDeckCards,
        name: savedDeck.name || deckName.trim(),
        visibility: savedDeck.visibility || deckVisibility,
      }));
      await refreshSavedDecks();
      setSnackbar('Deck saved.');
    } catch (saveError) {
      setSnackbar(saveError.message || 'Battle deck could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDeck() {
    if (!deleteCandidate) return;

    try {
      await deleteBattleDeck(deleteCandidate.id);
      setDeleteCandidate(null);
      await refreshSavedDecks();
      if (deleteCandidate.id === currentEditingDeckId) {
        const fingerprint = getDeckFingerprint({ cards: [], name: DEFAULT_DECK_NAME, visibility: 'private' });
        setCurrentEditingDeckId(null);
        setDeckName(DEFAULT_DECK_NAME);
        setDeckVisibility('private');
        setLoadedSavedCardsById(new Map());
        setSelectedIds([]);
        setSavedFingerprint(fingerprint);
      }
      setSnackbar('Deck deleted.');
    } catch (deleteError) {
      setSnackbar(deleteError.message || 'Deck could not be deleted.');
    }
  }

  function renderFilterGroup(group) {
    return (
      <Accordion disableGutters elevation={0} key={group.key} defaultExpanded={!isMobile}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={950}>{group.title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
            {group.options.map(([value, label]) => (
              <Chip
                key={value}
                color={filters[group.key] === value ? 'primary' : 'default'}
                label={label}
                onClick={() => updateFilter(group.key, value)}
                variant={filters[group.key] === value ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  const filtersContent = (
    <Card className="battleDeckFilterPanel" variant="outlined">
      <CardContent sx={{ display: 'grid', gap: 1.25 }}>
        <Stack direction="row" gap={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Filters</Typography>
          <Button disabled={!activeFilterCount} onClick={clearFilters} startIcon={<ClearIcon />} size="small">
            Clear Filters
          </Button>
        </Stack>
        {FILTER_GROUPS.map(renderFilterGroup)}
      </CardContent>
    </Card>
  );

  const buildToolbar = (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'grid', gap: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ alignItems: { xs: 'stretch', md: 'start' } }}>
          <TextField
            error={deckNameError}
            helperText={deckNameError ? 'Give your deck a name before saving.' : 'Max 40 characters.'}
            inputProps={{ maxLength: 40 }}
            label="Deck Name"
            onChange={(event) => setDeckName(event.target.value.slice(0, 40))}
            placeholder="Name your deck"
            sx={{ flex: 1 }}
            value={deckName}
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>Visibility</InputLabel>
            <Select label="Visibility" onChange={(event) => setDeckVisibility(event.target.value)} value={deckVisibility}>
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="friends">Friends</MenuItem>
              <MenuItem value="public">Public</MenuItem>
            </Select>
            <FormHelperText>Used for friend battles.</FormHelperText>
          </FormControl>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            {hasUnsavedChanges && <Chip color="warning" label="Unsaved changes" />}
            <Button disabled={deckNameError || isSaving} onClick={handleSaveDeck} startIcon={<SaveIcon />} variant="outlined">
              {currentEditingDeckId ? 'Update Deck' : 'Save Deck'}
            </Button>
            <Button disabled={!currentDeckCards.length || isSaving} onClick={handleClearDeck} startIcon={<ClearIcon />} variant="outlined">
              Clear Deck
            </Button>
            <Button disabled={!deckIsReady || isSaving} onClick={() => startDeck(currentDeckCards)} startIcon={<PlayArrowIcon />} variant="contained">
              Start Battle
            </Button>
          </Stack>
        </Stack>
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography color="text.secondary" fontWeight={900} variant="body2">
              Cards: {currentDeckCards.length} / {DECK_SIZE}
            </Typography>
            <Typography color={deckIsReady ? 'success.main' : 'warning.main'} fontWeight={900} variant="body2">
              {formatStartMessage(currentDeckCards.length, missingDeckCards.length)}
            </Typography>
          </Stack>
          <LinearProgress color={deckIsReady ? 'success' : 'warning'} value={progressValue} variant="determinate" />
        </Box>
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          <Chip label={`${deckStats.creatureCount} creatures`} size="small" variant="outlined" />
          <Chip label={`${deckStats.spellCount} spells`} size="small" variant="outlined" />
          <Chip label={`${deckStats.averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
          {missingDeckCards.length > 0 && <Chip color="warning" label={`${missingDeckCards.length} missing cards`} size="small" />}
        </Stack>
      </CardContent>
    </Card>
  );

  const collectionPanel = (
    <Card>
      <CardContent sx={{ display: 'grid', gap: 2, p: { xs: 1.25, sm: 2 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25}>
          <TextField
            fullWidth
            label="Search cards by name"
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
          <FormControl sx={{ minWidth: { xs: '100%', md: 190 } }}>
            <InputLabel>Sort by</InputLabel>
            <Select label="Sort by" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
              <MenuItem value="name">Name A-Z</MenuItem>
              <MenuItem value="costAsc">Cost Low to High</MenuItem>
              <MenuItem value="costDesc">Cost High to Low</MenuItem>
              <MenuItem value="rarity">Rarity</MenuItem>
              <MenuItem value="attack">Attack</MenuItem>
              <MenuItem value="health">Health</MenuItem>
              <MenuItem value="recent">Recently Opened</MenuItem>
            </Select>
          </FormControl>
          {isMobile && (
            <Button onClick={() => setFiltersOpen(true)} startIcon={<FilterListIcon />} variant="outlined">
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          )}
        </Stack>

        {!isMobile && filtersContent}

        {!isLoading && !filteredCards.length && (
          <Alert severity="info">No battle-ready cards match those filters. Try clearing one filter.</Alert>
        )}

        <Grid container spacing={{ xs: 1, sm: 1.5 }}>
          {filteredCards.map((card) => {
            const cardId = getDeckCardId(card);
            const selected = selectedIds.includes(cardId);
            return (
              <Grid key={cardId} size={{ xs: 12, sm: 6, xl: 4 }}>
                <BattleCard
                  card={card}
                  compact
                  disabled={!selected && selectedIds.length >= DECK_SIZE}
                  onClick={() => toggleCard(card)}
                  selected={selected}
                  size="preview"
                />
                <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5, px: 0.5 }}>
                  {getEffectSummary(card)} - {getColorLabel(card)}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );

  const deckPanel = (
    <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
      <CardContent sx={{ display: 'grid', gap: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">Current Deck</Typography>
            <Typography color="text.secondary" variant="body2">
              Specific owned copies selected
            </Typography>
          </Box>
          <Chip color={deckIsReady ? 'success' : 'warning'} label={`${currentDeckCards.length}/20`} />
        </Stack>
        <Divider />
        {!currentDeckCards.length && <Alert severity="info">Select cards from your collection to start building.</Alert>}
        {missingDeckCards.length > 0 && (
          <Alert severity="warning">Some cards in this deck are no longer in your collection.</Alert>
        )}
        <Card variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.025)' }}>
          <CardContent sx={{ display: 'grid', gap: 1.25, p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography fontWeight={950}>Deck Progress</Typography>
            <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
              <Chip label={`${deckStats.creatureCount} creatures`} size="small" variant="outlined" />
              <Chip label={`${deckStats.spellCount} spells`} size="small" variant="outlined" />
              <Chip label={`${deckStats.averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
            </Stack>
            <DeckBuilderInsights
              colorAnalysis={deckColorAnalysis}
              deckAnalysis={{
                averageCost: deckStats.averageCost,
                creatureCount: deckStats.creatureCount,
                spellCount: deckStats.spellCount,
                suggestions: currentDeckCards.length ? [] : ['Select cards to see deck quality suggestions.'],
              }}
              strategy={deckStrategy}
              warnings={deckBalanceWarnings}
            />
          </CardContent>
        </Card>
        <Stack gap={1} sx={{ maxHeight: { lg: '66vh' }, overflow: 'auto', pr: { lg: 0.5 } }}>
          {selectedCards.map((card, index) => (
            <Card key={`${getDeckCardId(card)}-${index}`} variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.025)' }}>
              <CardContent sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, p: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={950} noWrap variant="body2">
                    {index + 1}. {card.name}
                  </Typography>
                  <Typography color="text.secondary" noWrap variant="caption">
                    {card.type} - Cost {card.cost} - {getEffectSummary(card)}
                  </Typography>
                </Box>
                <IconButton aria-label={`Remove ${card.name}`} onClick={() => toggleCard(card)} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
          {missingDeckCards.map((card) => (
            <Card key={getDeckCardId(card)} variant="outlined" sx={{ borderColor: 'warning.main', bgcolor: 'rgba(255,193,7,0.06)' }}>
              <CardContent sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, p: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={950} noWrap variant="body2">
                    Missing: {card.name}
                  </Typography>
                  <Typography color="warning.main" noWrap variant="caption">
                    This card is no longer in your collection.
                  </Typography>
                </Box>
                <IconButton aria-label={`Remove missing ${card.name}`} onClick={() => removeMissingCard(card)} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle" variant="outlined" sx={{ mb: 3, minHeight: { xs: 44, sm: 36 } }}>
        Back to battle
      </Button>
      <PageHeader eyebrow="Binder Battle" title="Deck builder">
        Build and manage saved Binder Battle decks from your Supabase collection.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info" sx={{ mb: 3 }}>Loading your collection for battle...</Alert>}
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

      <Tabs onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2, borderBottom: '1px solid var(--panel-border)' }} value={activeTab} variant={isMobile ? 'fullWidth' : 'standard'}>
        <Tab label="Build Deck" value="build" />
        <Tab label="Saved Decks" value="saved" />
      </Tabs>

      {activeTab === 'build' && (
        <>
          {buildToolbar}
          {isMobile && (
            <Tabs onChange={(_, value) => setMobileBuildView(value)} sx={{ mb: 2 }} value={mobileBuildView} variant="fullWidth">
              <Tab label={`Collection (${filteredCards.length})`} value="collection" />
              <Tab label={`Current Deck (${currentDeckCards.length}/20)`} value="deck" />
            </Tabs>
          )}

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 8 }} sx={{ display: isMobile && mobileBuildView !== 'collection' ? 'none' : 'block' }}>
              {collectionPanel}
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }} sx={{ display: isMobile && mobileBuildView !== 'deck' ? 'none' : 'block' }}>
              {deckPanel}
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 'saved' && (
        <Card>
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">Saved Decks</Typography>
                <Typography color="text.secondary" variant="body2">
                  Load, edit, delete, or start battles from your saved decks.
                </Typography>
              </Box>
              <Button disabled={isRefreshingBattleData} onClick={handleRefreshBattleData} startIcon={<RefreshIcon />} variant="outlined">
                Refresh battle data
              </Button>
            </Stack>

            {!savedDecks.length ? (
              <Alert
                action={<Button onClick={() => setActiveTab('build')}>Build a Deck</Button>}
                severity="info"
              >
                No saved decks yet. Build a 20-card deck and save it here.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {savedDecks.map((deck) => (
                  <Grid key={deck.id} size={{ xs: 12, md: 6 }}>
                    <SavedDeckCard
                      deck={deck}
                      missingCount={getMissingDeckCards(deck, battleCards).length}
                      onDelete={setDeleteCandidate}
                      onLoad={loadDeckIntoBuilder}
                      onStart={(savedDeck) => startDeck(savedDeck.cards || [])}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {isMobile && activeTab === 'build' && (
        <Box className="mobileDeckBuilderActionBar">
          <Chip color={deckIsReady ? 'success' : 'warning'} label={`${currentDeckCards.length}/20`} />
          <Button disabled={deckNameError || isSaving} onClick={handleSaveDeck} sx={{ minHeight: 44 }} variant="outlined">
            {currentEditingDeckId ? 'Update' : 'Save'}
          </Button>
          <Button disabled={!deckIsReady || isSaving} onClick={() => startDeck(currentDeckCards)} sx={{ minHeight: 44 }} variant="contained">
            Start
          </Button>
        </Box>
      )}

      <Drawer anchor="bottom" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Box sx={{ maxHeight: '82vh', overflow: 'auto', p: 1.5 }}>
          {filtersContent}
        </Box>
      </Drawer>

      <Dialog open={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)}>
        <DialogTitle>Delete deck?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete {deleteCandidate?.name || 'this deck'}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteDeck} variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={3600} onClose={() => setSnackbar('')} open={Boolean(snackbar)} message={snackbar} />
    </Box>
  );
}
