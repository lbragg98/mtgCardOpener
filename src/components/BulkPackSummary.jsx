import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SearchIcon from '@mui/icons-material/Search';
import StyleIcon from '@mui/icons-material/Style';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCardPrice, getCardPriceLabel } from '../utils/cardPricing.js';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
import { revealExcitementScore } from '../utils/packGenerator.js';
import CardImage from './CardImage.jsx';
import CardInspectionDialog from './CardInspectionDialog.jsx';
import OpeningSceneBackground from './OpeningSceneBackground.jsx';

const PAGE_SIZE = 50;

function countCards(cards, predicate) {
  return cards.filter(predicate).length;
}

function getSummaryStats(allCards, packs, saveResult, boosterType, totalShardCost) {
  const duplicateShardRewards = saveResult?.shardsAwarded || 0;

  return [
    { label: 'Packs opened', value: packs.length },
    { label: 'Total cards', value: allCards.length },
    { label: 'Mythics', value: countCards(allCards, (card) => card.rarity === 'mythic') },
    { label: 'Rares', value: countCards(allCards, (card) => card.rarity === 'rare') },
    { label: 'Foils', value: countCards(allCards, (card) => card.isFoil) },
    { label: 'Collector exclusives', value: countCards(allCards, (card) => card.isCollectorExclusive) },
    { label: 'Duplicates', value: saveResult?.duplicateCount || 0 },
    { label: 'Duplicate shards', value: duplicateShardRewards },
    ...(boosterType === 'collector'
      ? [
          { label: 'Shards spent', value: totalShardCost },
          { label: 'Net shard change', value: duplicateShardRewards - totalShardCost },
        ]
      : []),
  ];
}

function filterAndSortCards(cards, { groupMode, rarity, search }) {
  const normalizedSearch = search.trim().toLowerCase();
  let filteredCards = cards.filter((card) => {
    const matchesSearch = !normalizedSearch || card.name?.toLowerCase().includes(normalizedSearch);
    const matchesRarity = rarity === 'all' || card.rarity === rarity;
    const matchesMode =
      groupMode === 'all' ||
      (groupMode === 'foils' && card.isFoil) ||
      (groupMode === 'duplicates' && card.isDuplicatePull) ||
      (groupMode === 'topValue' && getCardPrice(card) > 0) ||
      (groupMode === 'byPack' && true) ||
      (groupMode === 'byRarity' && true);

    return matchesSearch && matchesRarity && matchesMode;
  });

  if (groupMode === 'byPack') {
    filteredCards = [...filteredCards].sort((a, b) => (a.packNumber || 0) - (b.packNumber || 0));
  } else if (groupMode === 'byRarity') {
    const rarityRank = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
    filteredCards = [...filteredCards].sort((a, b) => (rarityRank[a.rarity] ?? 9) - (rarityRank[b.rarity] ?? 9));
  } else if (groupMode === 'topValue') {
    filteredCards = [...filteredCards].sort((a, b) => getCardPrice(b) - getCardPrice(a));
  } else {
    filteredCards = [...filteredCards].sort((a, b) => revealExcitementScore(b, b.boosterType || 'play') - revealExcitementScore(a, a.boosterType || 'play'));
  }

  return filteredCards;
}

export default function BulkPackSummary({
  allCards = [],
  boosterType,
  packs = [],
  saveError = '',
  saveResult,
  sceneId,
  setCode,
  setName,
  totalShardCost = 0,
}) {
  const [groupMode, setGroupMode] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCard, setSelectedCard] = useState(null);
  const oneOfOneCard = allCards.find(isOneOfOneRing);
  const stats = getSummaryStats(allCards, packs, saveResult, boosterType, totalShardCost);
  const filteredCards = useMemo(
    () => filterAndSortCards(allCards, { groupMode, rarity, search }),
    [allCards, groupMode, rarity, search],
  );
  const visibleCards = filteredCards.slice(0, visibleCount);

  function updateGroupMode(_, nextMode) {
    if (nextMode) {
      setGroupMode(nextMode);
      setVisibleCount(PAGE_SIZE);
    }
  }

  return (
    <Box sx={{ bgcolor: '#03050d', minHeight: '100vh', overflow: 'hidden', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, position: 'relative' }}>
      <OpeningSceneBackground phase="summary" sceneId={sceneId} />
      <Box sx={{ mx: 'auto', maxWidth: 1220, position: 'relative', zIndex: 1 }}>
        <Typography color="warning.main" fontWeight={950} gutterBottom>
          {setCode?.toUpperCase()} {boosterType === 'collector' ? 'Collector' : 'Play'} Booster bulk opening
        </Typography>
        <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 34, md: 44 }, mb: 1 }}>
          {packs.length} packs from {setName || setCode?.toUpperCase()}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {saveResult
            ? `${saveResult.savedCards.length.toLocaleString()} cards saved.`
            : saveError || 'Saving cards to your collection...'}
        </Typography>

        {saveError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {saveError}
          </Alert>
        )}

        {oneOfOneCard && (
          <Alert severity="warning" sx={{ mb: 3 }} variant="filled">
            Legendary One-of-One Pull: {oneOfOneCard.name}. Estimated value: {getCardPriceLabel(oneOfOneCard)}.
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.25, mb: 3 }}>
          {stats.map((stat) => (
            <Card key={stat.label} sx={{ borderColor: 'rgba(244, 201, 93, 0.24)' }}>
              <CardContent sx={{ p: 1.4 }}>
                <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
                  {stat.label}
                </Typography>
                <Typography color="warning.main" fontWeight={950}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ alignItems: 'center', display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) auto 180px' }, mb: 2.5 }}>
          <TextField
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search cards"
            size="small"
            value={search}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup exclusive onChange={updateGroupMode} size="small" value={groupMode} sx={{ flexWrap: 'wrap' }}>
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="byPack">By Pack</ToggleButton>
            <ToggleButton value="byRarity">Rarity</ToggleButton>
            <ToggleButton value="foils">Foils</ToggleButton>
            <ToggleButton value="duplicates">Duplicates</ToggleButton>
            <ToggleButton value="topValue">Top Value</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small">
            <InputLabel id="bulk-rarity-filter">Rarity</InputLabel>
            <Select label="Rarity" labelId="bulk-rarity-filter" onChange={(event) => setRarity(event.target.value)} value={rarity}>
              <MenuItem value="all">All rarities</MenuItem>
              <MenuItem value="mythic">Mythic</MenuItem>
              <MenuItem value="rare">Rare</MenuItem>
              <MenuItem value="uncommon">Uncommon</MenuItem>
              <MenuItem value="common">Common</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: { xs: 1.25, md: 1.6 }, mb: 3 }}>
          {visibleCards.map((card, index) => (
            <Card key={`${card.id}-${card.packNumber}-${card.bulkCardIndex || index}`} sx={{ minWidth: 0, overflow: 'hidden', position: 'relative' }}>
              <CardActionArea onClick={() => setSelectedCard(card)}>
                <CardImage card={card} className="bulkCardImage" variant="grid" />
                <CardContent sx={{ display: 'grid', gap: 0.65, p: 1 }}>
                  <Typography fontWeight={850} noWrap variant="body2">
                    {card.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={`Pack ${card.packNumber || '?'}`} size="small" />
                    <Chip label={card.rarity || 'card'} size="small" sx={{ textTransform: 'capitalize' }} />
                    {card.isDuplicatePull && <Chip color="secondary" label="Duplicate" size="small" />}
                    {card.isFoil && <Chip color="warning" label={FOIL_LABELS[normalizeFoilTreatment(card)] || 'Foil'} size="small" variant="outlined" />}
                    {card.isCollectorExclusive && <Chip color="warning" label={isOneOfOneRing(card) ? '1 of 1' : 'Exclusive'} size="small" variant="filled" />}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {visibleCount < filteredCards.length && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} variant="outlined">
              Show More
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button component={Link} startIcon={<AutoAwesomeIcon />} to={`/packs/${setCode}`} variant="contained">
            Open another pack
          </Button>
          <Button component={Link} startIcon={<StyleIcon />} to="/sets" variant="outlined">
            Choose another set
          </Button>
          <Button component={Link} startIcon={<CollectionsBookmarkIcon />} to="/collection" variant="outlined">
            View Collection
          </Button>
        </Box>
      </Box>

      <CardInspectionDialog card={selectedCard} onClose={() => setSelectedCard(null)} open={Boolean(selectedCard)} />
    </Box>
  );
}
