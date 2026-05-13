import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SearchIcon from '@mui/icons-material/Search';
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
  InputAdornment,
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
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyOwnedBinders,
  getOwnedBinderId as getCloudOwnedBinderId,
  isBinderOwned as isCloudBinderOwned,
  purchaseBinder as purchaseCloudBinder,
} from '../api/binders.js';
import { purchaseDisplayCase } from '../api/displayCases.js';
import BinderCover from '../components/BinderCover.jsx';
import OneOfOneRingReveal from '../components/OneOfOneRingReveal.jsx';
import ShopItemCard from '../components/shop/ShopItemCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCosmetics } from '../context/CosmeticsContext.jsx';
import { BINDER_CATALOG } from '../utils/binderCatalog.js';
import { getPackShards } from '../utils/collectionStorage.js';
import {
  getFeaturedShopItems,
  getShopItemsByCategory,
  SHOP_CATALOG,
  SHOP_CATEGORIES,
} from '../utils/shopCatalog.js';
import {
  getOwnedBinders,
  isBinderOwned as isLocalBinderOwned,
  purchaseBinder as purchaseLocalBinder,
} from '../utils/binderStorage.js';

function getOwnedBinderId(catalogBinderId, ownedBinders) {
  return ownedBinders.find((binder) => binder.binderId === catalogBinderId)?.ownedBinderId;
}

const BINDER_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Affordable', value: 'affordable' },
  { label: 'Locked', value: 'locked' },
  { label: 'Owned', value: 'owned' },
];

const SORT_OPTIONS = [
  { label: 'By capacity', value: 'capacity' },
  { label: 'By price', value: 'price' },
];

const COSMETIC_TABS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Themes', value: SHOP_CATEGORIES.THEMES },
  { label: 'Opening Scenes', value: SHOP_CATEGORIES.OPENING_SCENES },
  { label: 'Sleeves', value: SHOP_CATEGORIES.SLEEVES },
  { label: 'Tear Effects', value: SHOP_CATEGORIES.TEAR_EFFECTS },
  { label: 'Reveal Effects', value: SHOP_CATEGORIES.REVEAL_EFFECTS },
  { label: 'Profile', value: SHOP_CATEGORIES.PROFILE_COSMETICS },
  { label: 'Binder Cosmetics', value: SHOP_CATEGORIES.BINDER_COSMETICS },
  { label: 'Display Cases', value: SHOP_CATEGORIES.DISPLAY_CASES },
  { label: 'Trade Skins', value: SHOP_CATEGORIES.TRADE_SKINS },
  { label: 'History Frames', value: SHOP_CATEGORIES.HISTORY_FRAMES },
  { label: 'Home Widgets', value: SHOP_CATEGORIES.HOME_WIDGETS },
];

const COSMETIC_FILTERS = ['All', 'Affordable', 'Owned', 'Equipped', 'Locked', 'Common', 'Rare', 'Mythic', 'Legendary'];

const TIER_COLORS = {
  common: '#b9bfd8',
  uncommon: '#4cc9f0',
  rare: '#f4c95d',
  mythic: '#ff8a3d',
  legendary: '#ffe6a3',
};

export default function Shop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    equipItem,
    isEquipped,
    isOwned,
    purchaseItem,
    refreshCosmetics,
  } = useCosmetics();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [packShards, setPackShards] = useState(() => getPackShards());
  const [ownedBinders, setOwnedBinders] = useState([]);
  const [binderToBuy, setBinderToBuy] = useState(null);
  const [binderFilter, setBinderFilter] = useState('all');
  const [cosmeticTab, setCosmeticTab] = useState('featured');
  const [cosmeticFilter, setCosmeticFilter] = useState('All');
  const [cosmeticSearch, setCosmeticSearch] = useState('');
  const [itemToBuy, setItemToBuy] = useState(null);
  const [lastPurchasedBinderId, setLastPurchasedBinderId] = useState('');
  const [sortBy, setSortBy] = useState('capacity');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const [isOneRingDemoOpen, setIsOneRingDemoOpen] = useState(false);
  const ownedCount = ownedBinders.length;
  const ownedProgress = (ownedCount / BINDER_CATALOG.length) * 100;
  const visibleBinders = BINDER_CATALOG.filter((binder) => {
    const owned = user ? isCloudBinderOwned(binder.id, ownedBinders) : isLocalBinderOwned(binder.id);
    const canAfford = packShards >= binder.price;

    if (binderFilter === 'affordable') return !owned && canAfford;
    if (binderFilter === 'locked') return !owned;
    if (binderFilter === 'owned') return owned;
    return true;
  }).sort((a, b) => (sortBy === 'price' ? a.price - b.price : a.capacity - b.capacity));
  const visibleCosmetics = (cosmeticTab === 'featured'
    ? getFeaturedShopItems()
    : getShopItemsByCategory(cosmeticTab)
  )
    .filter((item) => {
      const normalizedSearch = cosmeticSearch.trim().toLowerCase();
      const owned = isOwned(item.id);
      const equipped = isEquipped(item.id);
      const affordable = packShards >= item.price;

      if (normalizedSearch && !`${item.name} ${item.description}`.toLowerCase().includes(normalizedSearch)) {
        return false;
      }

      if (cosmeticFilter === 'Affordable') return !owned && affordable;
      if (cosmeticFilter === 'Owned') return owned;
      if (cosmeticFilter === 'Equipped') return equipped;
      if (cosmeticFilter === 'Locked') return !owned && !affordable;
      if (['Common', 'Rare', 'Mythic', 'Legendary'].includes(cosmeticFilter)) {
        return item.rarity === cosmeticFilter.toLowerCase();
      }

      return true;
    });

  async function refreshShopState() {
    setPackShards(getPackShards());
    await refreshCosmetics();

    if (user) {
      setOwnedBinders(await getMyOwnedBinders());
    } else {
      setOwnedBinders(getOwnedBinders());
    }
  }

  useEffect(() => {
    function refreshWithErrorHandling() {
      refreshShopState().catch((error) => {
        setSnackbar({ message: error.message || 'Unable to load shop data.', severity: 'error' });
      });
    }

    refreshShopState().catch((error) => {
      setSnackbar({ message: error.message || 'Unable to load shop data.', severity: 'error' });
    });

    window.addEventListener('packShardsUpdated', refreshWithErrorHandling);
    window.addEventListener('bindersUpdated', refreshWithErrorHandling);
    window.addEventListener('shopUpdated', refreshWithErrorHandling);
    window.addEventListener('cosmeticsUpdated', refreshWithErrorHandling);
    window.addEventListener('storage', refreshWithErrorHandling);

    return () => {
      window.removeEventListener('packShardsUpdated', refreshWithErrorHandling);
      window.removeEventListener('bindersUpdated', refreshWithErrorHandling);
      window.removeEventListener('shopUpdated', refreshWithErrorHandling);
      window.removeEventListener('cosmeticsUpdated', refreshWithErrorHandling);
      window.removeEventListener('storage', refreshWithErrorHandling);
    };
  }, [refreshCosmetics, user]);

  async function handleConfirmPurchase() {
    if (!binderToBuy) {
      return;
    }

    try {
      const result = user
        ? await purchaseCloudBinder(binderToBuy.id)
        : purchaseLocalBinder(binderToBuy.id);
      setBinderToBuy(null);
      await refreshShopState();
      setLastPurchasedBinderId(result.catalogBinder.id);
      setSnackbar({ message: `Purchased ${result.catalogBinder.name}!`, severity: 'success' });
      window.setTimeout(() => setLastPurchasedBinderId(''), 1600);
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
  }

  async function handleConfirmCosmeticPurchase() {
    if (!itemToBuy) {
      return;
    }

    try {
      if (itemToBuy.category === SHOP_CATEGORIES.DISPLAY_CASES) {
        const result = await purchaseDisplayCase(itemToBuy.id);
        setItemToBuy(null);
        setPackShards(result?.newShardBalance ?? getPackShards());
        setSnackbar({ message: `Purchased ${itemToBuy.name}!`, severity: 'success' });
        return;
      }

      const result = await purchaseItem(itemToBuy.id);
      setItemToBuy(null);
      setPackShards(result?.newShardBalance ?? getPackShards());
      setSnackbar({ message: `Purchased ${itemToBuy.name}!`, severity: 'success' });
    } catch (error) {
      setSnackbar({ message: error.message || 'Unable to purchase cosmetic.', severity: 'error' });
    }
  }

  async function handleEquipCosmetic(item) {
    try {
      await equipItem(item.id);
      setSnackbar({ message: `Equipped ${item.name}.`, severity: 'success' });
    } catch (error) {
      setSnackbar({ message: error.message || 'Unable to equip cosmetic.', severity: 'error' });
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
      <Card sx={{ mb: 3, overflow: 'hidden', borderColor: 'var(--panel-border)' }}>
        <CardContent
          sx={{
            display: 'grid',
            gap: 3,
            p: { xs: 2.25, md: 4 },
            background:
              'radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--accent-color) 16%, transparent), transparent 28rem), radial-gradient(circle at 86% 28%, var(--primary-glow), transparent 24rem), var(--panel-bg)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3} sx={{ alignItems: { xs: 'flex-start', md: 'center' } }}>
            <Box>
              <Chip color="warning" icon={<LocalAtmIcon />} label={`${packShards.toLocaleString()} Pack Shards`} sx={{ mb: 2, fontWeight: 900 }} variant="outlined" />
              <Typography variant="h2" sx={{ fontSize: { xs: 40, md: 58 }, lineHeight: 0.98 }}>
                Shop
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1.5, fontSize: { xs: 16, md: 18 } }}>
                Spend Pack Shards on themes, opening scenes, sleeves, binders, and cosmetics.
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
              <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
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
              <Stack direction="row" justifyContent="space-between" gap={2} sx={{ alignItems: 'center' }}>
                <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
                  Owned Progress
                </Typography>
                <Typography fontWeight={900}>
                  Owned {ownedCount} / {BINDER_CATALOG.length} binders
                </Typography>
              </Stack>
              <LinearProgress color="warning" value={ownedProgress} variant="determinate" sx={{ height: 12, borderRadius: 99, bgcolor: 'rgba(248, 247, 255, 0.08)' }} />
              <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
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

      <Card sx={{ mb: 3, maxWidth: '100%', overflow: 'hidden' }}>
        <CardContent sx={{ display: 'grid', gap: { xs: 1.75, sm: 2.5 }, minWidth: 0, p: { xs: 1.25, sm: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
            <Box>
              <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
                Cosmetic Shop
              </Typography>
              <Typography color="text.secondary">
                Spend Pack Shards on themes, opening scenes, sleeves, binders, and cosmetics.
              </Typography>
            </Box>
            <Chip
              color="warning"
              icon={<LocalAtmIcon />}
              label={`${packShards.toLocaleString()} Pack Shards`}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, fontWeight: 900 }}
              variant="outlined"
            />
            <Chip
              label={`${SHOP_CATALOG.length} cosmetics`}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, fontWeight: 900 }}
              variant="outlined"
            />
          </Stack>

          <Tabs
            allowScrollButtonsMobile
            onChange={(_, value) => setCosmeticTab(value)}
            scrollButtons="auto"
            value={cosmeticTab}
            variant="scrollable"
            sx={{
              maxWidth: '100%',
              mx: { xs: -1, sm: 0 },
              px: { xs: 1, sm: 0 },
              borderBottom: '1px solid var(--panel-border)',
              '& .MuiTabs-scroller': { overflowX: 'auto !important' },
              '& .MuiTab-root': {
                minHeight: 44,
                px: { xs: 1.35, sm: 2 },
                fontSize: { xs: 12, sm: 13 },
                fontWeight: 950,
                whiteSpace: 'nowrap',
              },
            }}
          >
            {COSMETIC_TABS.map((tab) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} />
            ))}
          </Tabs>

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              p: { xs: 1.25, sm: 1.5 },
              border: '1px solid var(--panel-border)',
              borderRadius: 2,
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--secondary-accent) 8%, transparent), color-mix(in srgb, var(--app-bg) 44%, transparent))',
            }}
          >
            <TextField
              fullWidth
              label="Search cosmetics"
              onChange={(event) => setCosmeticSearch(event.target.value)}
              value={cosmeticSearch}
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

            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
              {COSMETIC_FILTERS.map((filterOption) => (
                <Chip
                  clickable
                  color={cosmeticFilter === filterOption ? 'warning' : 'default'}
                  key={filterOption}
                  label={filterOption}
                  onClick={() => setCosmeticFilter(filterOption)}
                  sx={{ fontWeight: 900 }}
                  variant={cosmeticFilter === filterOption ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
              Showing {visibleCosmetics.length.toLocaleString()} item{visibleCosmetics.length === 1 ? '' : 's'}
            </Typography>
          </Box>

          {!visibleCosmetics.length ? (
            <Card sx={{ borderStyle: 'dashed', textAlign: 'center' }}>
              <CardContent sx={{ display: 'grid', gap: 1.5, justifyItems: 'center', py: 5 }}>
                <AutoAwesomeIcon color="warning" sx={{ fontSize: 42 }} />
                <Typography variant="h5">No cosmetics match</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
                  Try a different category, rarity, or search term.
                </Typography>
                <Button
                  onClick={() => {
                    setCosmeticFilter('All');
                    setCosmeticSearch('');
                    setCosmeticTab('featured');
                  }}
                  variant="outlined"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
              {visibleCosmetics.map((item) => {
                const owned = isOwned(item.id);
                const equipped = isEquipped(item.id);
                const canAfford = packShards >= item.price;

                return (
                  <Grid key={item.id} size={{ xs: 12, sm: 12, md: 6, lg: 4 }} sx={{ minWidth: 0 }}>
                    <ShopItemCard
                      canAfford={canAfford}
                      equipped={equipped}
                      item={item}
                      missingShards={Math.max(item.price - packShards, 0)}
                      onBuy={setItemToBuy}
                      onEquip={handleEquipCosmetic}
                      onManageBinderCosmetics={() => navigate('/binders')}
                      owned={owned}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}>
        <Box>
          <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
            Binder Shop
          </Typography>
          <Typography color="text.secondary">
            Physical binder unlocks remain available here.
          </Typography>
        </Box>
        <Chip label={`${BINDER_CATALOG.length} binders`} variant="outlined" />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            {BINDER_FILTER_OPTIONS.map((option) => (
              <Chip
                clickable
                color={binderFilter === option.value ? 'warning' : 'default'}
                key={option.value}
                label={option.label}
                onClick={() => setBinderFilter(option.value)}
                variant={binderFilter === option.value ? 'filled' : 'outlined'}
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
          const owned = user ? isCloudBinderOwned(binder.id, ownedBinders) : isLocalBinderOwned(binder.id);
          const canAfford = packShards >= binder.price;
          const needShards = Math.max(binder.price - packShards, 0);
          const ownedBinderId = user
            ? getCloudOwnedBinderId(binder.id, ownedBinders)
            : getOwnedBinderId(binder.id, ownedBinders);
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
                  <Stack direction="row" justifyContent="space-between" gap={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="h5">{binder.name}</Typography>
                    {owned && <CheckCircleIcon color="success" />}
                  </Stack>
                  <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
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
                  <Typography sx={{ color: 'var(--text-accent)', fontSize: 13, fontWeight: 800 }}>
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

      <Dialog fullWidth maxWidth="xs" open={Boolean(itemToBuy)} onClose={() => setItemToBuy(null)}>
        <DialogTitle>Buy {itemToBuy?.name}?</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography color="text.secondary">
            Add this cosmetic to your account for {itemToBuy?.price.toLocaleString()} Pack Shards.
          </Typography>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={itemToBuy?.rarity || ''} size="small" sx={{ fontWeight: 900, textTransform: 'capitalize' }} variant="outlined" />
            <Chip color="warning" icon={<LocalAtmIcon />} label={`${itemToBuy?.price?.toLocaleString() || 0} Pack Shards`} size="small" sx={{ fontWeight: 900 }} variant="outlined" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setItemToBuy(null)}>Cancel</Button>
          <Button onClick={handleConfirmCosmeticPurchase} variant="contained">
            Buy Cosmetic
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={3200}
        onClose={() => setSnackbar({ message: '', severity: 'success' })}
        open={Boolean(snackbar.message)}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
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
