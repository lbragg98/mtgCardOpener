import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { formatPrice, getCardPrice, getCardPriceLabel } from '../utils/cardPricing.js';
import CardImage from './CardImage.jsx';

const ALL_FILTER = 'all';

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function TradeValueSummary({ cards, label }) {
  const total = cards.reduce((sum, card) => sum + getCardPrice(card), 0);

  return <Chip color="warning" label={`${label}: ${formatPrice(total)}`} sx={{ fontWeight: 900 }} variant="outlined" />;
}

export default function TradeCardPicker({ cards, emptyText, selectedIds, setSelectedIds, title }) {
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState(ALL_FILTER);
  const [setCode, setSetCode] = useState(ALL_FILTER);
  const [foil, setFoil] = useState(ALL_FILTER);
  const [value, setValue] = useState(ALL_FILTER);
  const rarityOptions = useMemo(() => sortedUnique(cards.map((card) => card.rarity)), [cards]);
  const setOptions = useMemo(() => sortedUnique(cards.map((card) => card.set)), [cards]);
  const selectedCards = useMemo(() => cards.filter((card) => selectedIds.includes(card.userCardId)), [cards, selectedIds]);
  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesSearch = !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesRarity = rarity === ALL_FILTER || card.rarity === rarity;
      const matchesSet = setCode === ALL_FILTER || card.set === setCode;
      const matchesFoil = foil === ALL_FILTER || (foil === 'foil' ? card.isFoil : !card.isFoil);
      const price = getCardPrice(card);
      const matchesValue =
        value === ALL_FILTER ||
        (value === 'under5' && price < 5) ||
        (value === '5to25' && price >= 5 && price <= 25) ||
        (value === 'over25' && price > 25);

      return matchesSearch && matchesRarity && matchesSet && matchesFoil && matchesValue;
    });
  }, [cards, foil, rarity, search, setCode, value]);

  function toggleCard(cardId) {
    setSelectedIds((currentIds) =>
      currentIds.includes(cardId) ? currentIds.filter((id) => id !== cardId) : [...currentIds, cardId],
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h5">{title}</Typography>
          <TradeValueSummary cards={selectedCards} label="Selected" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(4, 1fr)' }, gap: 1 }}>
          <TextField
            label="Search"
            onChange={(event) => setSearch(event.target.value)}
            size="small"
            value={search}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="secondary" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small">
            <InputLabel>Rarity</InputLabel>
            <Select label="Rarity" onChange={(event) => setRarity(event.target.value)} value={rarity}>
              <MenuItem value={ALL_FILTER}>All</MenuItem>
              {rarityOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Set</InputLabel>
            <Select label="Set" onChange={(event) => setSetCode(event.target.value)} value={setCode}>
              <MenuItem value={ALL_FILTER}>All</MenuItem>
              {setOptions.map((option) => (
                <MenuItem key={option} value={option}>{option.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Foil</InputLabel>
            <Select label="Foil" onChange={(event) => setFoil(event.target.value)} value={foil}>
              <MenuItem value={ALL_FILTER}>All</MenuItem>
              <MenuItem value="foil">Foil</MenuItem>
              <MenuItem value="nonfoil">Non-foil</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Value</InputLabel>
            <Select label="Value" onChange={(event) => setValue(event.target.value)} value={value}>
              <MenuItem value={ALL_FILTER}>All</MenuItem>
              <MenuItem value="under5">Under $5</MenuItem>
              <MenuItem value="5to25">$5-$25</MenuItem>
              <MenuItem value="over25">Over $25</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredCards.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {emptyText}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.25,
              maxHeight: 560,
              overflow: 'auto',
              pr: 0.5,
            }}
          >
            {filteredCards.map((card) => {
              const checked = selectedIds.includes(card.userCardId);

              return (
                <Card
                  key={card.userCardId}
                  onClick={() => toggleCard(card.userCardId)}
                  sx={{
                    cursor: 'pointer',
                    borderColor: checked ? 'rgba(244, 201, 93, 0.86)' : undefined,
                    boxShadow: checked ? '0 0 28px rgba(244, 201, 93, 0.18)' : undefined,
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Checkbox checked={checked} sx={{ position: 'absolute', right: 2, top: 2, zIndex: 2 }} />
                    <CardImage card={card} variant="grid" />
                  </Box>
                  <CardContent sx={{ p: 1 }}>
                    <Typography fontWeight={900} noWrap variant="body2">{card.name}</Typography>
                    <Typography color="text.secondary" display="block" variant="caption">
                      {card.rarity} - {card.set?.toUpperCase()}
                    </Typography>
                    <Typography color="warning.main" fontWeight={900} variant="caption">
                      {getCardPriceLabel(card)}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
