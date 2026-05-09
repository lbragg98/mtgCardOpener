import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
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
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BinderCover from '../components/BinderCover.jsx';
import OneOfOneRingReveal from '../components/OneOfOneRingReveal.jsx';
import { BINDER_CATALOG } from '../utils/binderCatalog.js';
import { getPackShards } from '../utils/collectionStorage.js';
import { getOwnedBinders, isBinderOwned, purchaseBinder } from '../utils/binderStorage.js';

function getOwnedBinderId(catalogBinderId, ownedBinders) {
  return ownedBinders.find((binder) => binder.binderId === catalogBinderId)?.ownedBinderId;
}

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Affordable', value: 'affordable' },
  { label: 'Locked', value: 'locked' },
  { label: 'Owned', value: 'owned' },
];

const SORT_OPTIONS = [
  { label: 'By capacity', value: 'capacity' },
  { label: 'By price', value: 'price' },
];

const TIER_COLORS = {
  common: '#b9bfd8',
  uncommon: '#4cc9f0',
  rare: '#f4c95d',
  mythic: '#ff8a3d',
  legendary: '#ffe6a3',
};

export default function Shop() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [packShards, setPackShards] = useState(() => getPackShards());
  const [ownedBinders, setOwnedBinders] = useState(() => getOwnedBinders());
  const [binderToBuy, setBinderToBuy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastPurchasedBinderId, setLastPurchasedBinderId] = useState('');
  const [sortBy, setSortBy] = useState('capacity');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const [isOneRingDemoOpen, setIsOneRingDemoOpen] = useState(false);
  const ownedCount = ownedBinders.length;
  const ownedProgress = (ownedCount / BINDER_CATALOG.length) * 100;
  const visibleBinders = BINDER_CATALOG.filter((binder) => {
    const owned = isBinderOwned(binder.id);
    const canAfford = packShards >= binder.price;

    if (filter === 'affordable') return !owned && canAfford;
    if (filter === 'locked') return !owned;
    if (filter === 'owned') return owned;
    return true;
  }).sort((a, b) => (sortBy === 'price' ? a.price - b.price : a.capacity - b.capacity));

  function refreshShopState() {
    setPackShards(getPackShards());
    setOwnedBinders(getOwnedBinders());
  }

  useEffect(() => {
    window.addEventListener('packShardsUpdated', refreshShopState);
    window.addEventListener('bindersUpdated', refreshShopState);
    window.addEventListener('storage', refreshShopState);

    return () => {
      window.removeEventListener('packShardsUpdated', refreshShopState);
      window.removeEventListener('bindersUpdated', refreshShopState);
      window.removeEventListener('storage', refreshShopState);
    };
  }, []);

  function handleConfirmPurchase() {
    if (!binderToBuy) {
      return;
    }

    try {
      const result = purchaseBinder(binderToBuy.id);
      setBinderToBuy(null);
      refreshShopState();
      setLastPurchasedBinderId(result.catalogBinder.id);
      setSnackbar({ message: `Purchased ${result.catalogBinder.name}!`, severity: 'success' });
      window.setTimeout(() => setLastPurchasedBinderId(''), 1600);
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
  }

  return (
    <Box sx={{ position: 'relative', maxWidth: '100%', overflowX: 'clip' }}>
      <Button
        color="warning"
        onClick={() => setIsOneRingDemoOpen(true)}
        size="small"
        sx={{ position: 'absolute', left: 0, top: -6, zIndex: 3, minWidth: 0, px: 1.25, fontWeight: 900 }}
        variant="outlined"
      >
        1/1
      </Button>
      <Card sx={{ mb: 3, overflow: 'hidden', borderColor: 'rgba(244, 201, 93, 0.24)' }}>
        <CardContent
          sx={{
            display: 'grid',
            gap: 3,
            p: { xs: 2.25, md: 4 },
            background:
              'radial-gradient(circle at 12% 18%, rgba(244, 201, 93, 0.16), transparent 28rem), radial-gradient(circle at 86% 28%, rgba(143, 124, 255, 0.16), transparent 24rem), linear-gradient(135deg, rgba(16,20,38,0.98), rgba(5,7,17,0.96))',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={3}>
            <Box>
              <Chip color="warning" icon={<LocalAtmIcon />} label={`${packShards.toLocaleString()} Pack Shards`} sx={{ mb: 2, fontWeight: 900 }} variant="outlined" />
              <Typography variant="h2" sx={{ fontSize: { xs: 40, md: 58 }, lineHeight: 0.98 }}>
                Binder Shop
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1.5, fontSize: { xs: 16, md: 18 } }}>
                Spend Pack Shards to unlock collectible binders and organize your favorite pulls.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Button fullWidth startIcon={<AutoAwesomeIcon />} onClick={() => navigate('/sets')} variant="contained">
                Open Packs
              </Button>
              <Button fullWidth startIcon={<CollectionsBookmarkIcon />} onClick={() => navigate('/collection')} variant="outlined">
                View Collection
              </Button>
              <Button fullWidth startIcon={<Inventory2Icon />} onClick={() => navigate('/binders')} variant="outlined">
                My Binders
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'grid', gap: 1.5 }}>
              <Typography color="warning.main" fontWeight={950}>
                Shard Balance
              </Typography>
              <Typography variant="h3" sx={{ fontSize: { xs: 34, md: 44 } }}>
                {packShards.toLocaleString()}
              </Typography>
              <Typography color="text.secondary">Duplicates grant 100 shards. Recycling grants 25 shards.</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'grid', gap: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography color="warning.main" fontWeight={950}>
                  Owned Progress
                </Typography>
                <Typography fontWeight={900}>
                  Owned {ownedCount} / {BINDER_CATALOG.length} binders
                </Typography>
              </Stack>
              <LinearProgress color="warning" value={ownedProgress} variant="determinate" sx={{ height: 12, borderRadius: 99, bgcolor: 'rgba(248, 247, 255, 0.08)' }} />
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {['common', 'uncommon', 'rare', 'mythic', 'legendary'].map((tier) => (
                  <Chip
                    key={tier}
                    label={tier}
                    size="small"
                    sx={{
                      borderColor: `${TIER_COLORS[tier]}88`,
                      color: TIER_COLORS[tier],
                      fontWeight: 900,
                      textTransform: 'capitalize',
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {FILTER_OPTIONS.map((option) => (
              <Chip
                clickable
                color={filter === option.value ? 'warning' : 'default'}
                key={option.value}
                label={option.label}
                onClick={() => setFilter(option.value)}
                variant={filter === option.value ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <Select onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {visibleBinders.map((binder) => {
          const owned = isBinderOwned(binder.id);
          const canAfford = packShards >= binder.price;
          const needShards = Math.max(binder.price - packShards, 0);
          const ownedBinderId = getOwnedBinderId(binder.id, ownedBinders);
          const wasJustPurchased = lastPurchasedBinderId === binder.id;

          return (
            <Grid key={binder.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                className={wasJustPurchased ? 'binderPurchasePulse' : ''}
                sx={{
                  height: '100%',
                  overflow: 'hidden',
                  borderColor: owned ? `${binder.colors.accent}88` : `${binder.colors.accent}33`,
                  cursor: owned ? 'pointer' : 'default',
                  '&:hover .binderBook': { transform: 'translateY(-4px) rotateX(2deg) rotateY(-2deg)' },
                }}
                onClick={() => {
                  if (owned && ownedBinderId) {
                    navigate(`/binders/${ownedBinderId}`);
                  }
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', p: { xs: 2, md: 2.5 } }}>
                  <BinderCover animated binder={binder} owned={owned} size="medium" />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="h5">{binder.name}</Typography>
                    {owned && <CheckCircleIcon color="success" />}
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      label={binder.rarity}
                      size="small"
                      sx={{
                        borderColor: `${TIER_COLORS[binder.rarity] || binder.colors.accent}99`,
                        color: TIER_COLORS[binder.rarity] || binder.colors.accent,
                        textTransform: 'capitalize',
                        fontWeight: 900,
                      }}
                      variant="outlined"
                    />
                    <Chip label={`${binder.capacity} cards`} size="small" variant="outlined" />
                    <Chip color="warning" icon={<LocalAtmIcon />} label={binder.price.toLocaleString()} size="small" variant="outlined" />
                  </Stack>
                  <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                    {binder.description}
                  </Typography>
                  <Typography color="warning.main" sx={{ fontSize: 13, fontWeight: 800 }}>
                    {binder.unlockText}
                  </Typography>
                  <Button
                    disabled={!owned && !canAfford}
                    fullWidth
                    onClick={(event) => {
                      event.stopPropagation();
                      if (owned) {
                        navigate(`/binders/${ownedBinderId}`);
                      } else {
                        setBinderToBuy(binder);
                      }
                    }}
                    startIcon={owned ? <Inventory2Icon /> : <AutoAwesomeIcon />}
                    variant={owned || canAfford ? 'contained' : 'outlined'}
                  >
                    {owned ? 'View Binder' : canAfford ? `Buy for ${binder.price.toLocaleString()} Shards` : `Need ${needShards.toLocaleString()} more shards`}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={Boolean(binderToBuy)} onClose={() => setBinderToBuy(null)}>
        <DialogTitle>Buy {binderToBuy?.name}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Buy this binder for {binderToBuy?.price.toLocaleString()} Pack Shards? It can hold {binderToBuy?.capacity} cards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBinderToBuy(null)}>Cancel</Button>
          <Button onClick={handleConfirmPurchase} variant="contained">
            Buy Binder
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={3200} onClose={() => setSnackbar({ message: '', severity: 'success' })} open={Boolean(snackbar.message)}>
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog fullScreen onClose={() => setIsOneRingDemoOpen(false)} open={isOneRingDemoOpen}>
        <Box sx={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', bgcolor: '#000' }}>
          <Button
            color="warning"
            onClick={() => setIsOneRingDemoOpen(false)}
            sx={{ position: 'absolute', right: 16, top: 16, zIndex: 40, fontWeight: 900 }}
            variant="outlined"
          >
            Close
          </Button>
          <OneOfOneRingReveal
            key={isOneRingDemoOpen ? 'one-ring-demo-open' : 'one-ring-demo-closed'}
            active={isOneRingDemoOpen}
            card={{
              collectorExclusiveReason: 'one-of-one',
              collector_number: '001/001',
              isCollectorExclusive: true,
              isOneOfOne: true,
              name: 'The One Ring',
              rarity: 'mythic',
              specialPullType: 'one-of-one-ring',
            }}
            isMobile={isMobile}
          />
        </Box>
      </Dialog>
    </Box>
  );
}
