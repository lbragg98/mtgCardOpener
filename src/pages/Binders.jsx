import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOwnedBinders } from '../api/binders.js';
import BinderCover from '../components/BinderCover.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getCatalogBinderById } from '../utils/binderCatalog.js';
import { getOwnedBinders } from '../utils/binderStorage.js';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';
import { getCollection } from '../utils/collectionStorage.js';

function getBinderCards(ownedBinder, collectionById) {
  return ownedBinder.cards.map((collectionId) => collectionById.get(collectionId)).filter(Boolean);
}

function getBinderValue(cards) {
  return cards.reduce((total, card) => total + getCardPrice(card), 0);
}

export default function Binders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ownedBinders, setOwnedBinders] = useState([]);
  const [collection, setCollection] = useState([]);
  const [error, setError] = useState('');
  const collectionById = useMemo(
    () => new Map(collection.map((card) => [card.collectionId, card])),
    [collection],
  );

  useEffect(() => {
    let isMounted = true;

    async function refreshBinderData() {
      try {
        setError('');

        if (user) {
          const cloudBinders = await getMyOwnedBinders();

          if (isMounted) {
            setOwnedBinders(cloudBinders);
            setCollection([]);
          }

          return;
        }

        if (isMounted) {
          setOwnedBinders(getOwnedBinders());
          setCollection(getCollection());
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load binders.');
          setOwnedBinders([]);
        }
      }
    }

    refreshBinderData();
    window.addEventListener('bindersUpdated', refreshBinderData);
    window.addEventListener('collectionUpdated', refreshBinderData);
    window.addEventListener('storage', refreshBinderData);

    return () => {
      isMounted = false;
      window.removeEventListener('bindersUpdated', refreshBinderData);
      window.removeEventListener('collectionUpdated', refreshBinderData);
      window.removeEventListener('storage', refreshBinderData);
    };
  }, [user]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 4 }}>
        <Box>
          <Chip color="warning" icon={<Inventory2Icon />} label={`${ownedBinders.length} owned`} sx={{ mb: 2, fontWeight: 900 }} variant="outlined" />
          <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 52 }, lineHeight: 1 }}>
            My Binders
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 720, mt: 1 }}>
            Open your owned binders and, soon, place favorite collection cards into themed pages.
          </Typography>
        </Box>
        <Button startIcon={<AddShoppingCartIcon />} onClick={() => navigate('/shop')} variant="contained">
          Binder Shop
        </Button>
      </Stack>

      {error && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {!ownedBinders.length ? (
        <Card>
          <CardContent sx={{ display: 'grid', justifyItems: 'center', gap: 2, py: 7, textAlign: 'center' }}>
            <CollectionsBookmarkIcon color="warning" sx={{ fontSize: 58 }} />
            <Typography variant="h4">No binders yet</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
              Buy your first binder with Pack Shards, then use it to organize favorite pulls from your collection.
            </Typography>
            <Button startIcon={<AddShoppingCartIcon />} onClick={() => navigate('/shop')} variant="contained">
              Go to Binder Shop
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {ownedBinders.map((ownedBinder) => {
            const binder = ownedBinder.catalogBinder || getCatalogBinderById(ownedBinder.binderId);
            const binderCards = user ? ownedBinder.binderCards || [] : getBinderCards(ownedBinder, collectionById);
            const used = binderCards.length;
            const binderValue = getBinderValue(binderCards);
            const progress = Math.min((used / binder.capacity) * 100, 100);
            const displayBinder = {
              ...binder,
              cosmetics: {
                claspId: ownedBinder.equippedClaspId || '',
                auraId: ownedBinder.equippedAuraId || '',
              },
            };

            return (
              <Grid key={ownedBinder.ownedBinderId} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  onClick={() => navigate(`/binders/${ownedBinder.ownedBinderId}`)}
                  sx={{
                    height: '100%',
                    borderColor: `${binder.colors.accent}55`,
                    cursor: 'pointer',
                    '&:hover .binderBook': { transform: 'translateY(-4px) rotateX(2deg) rotateY(-2deg)' },
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                    <BinderCover animated binder={displayBinder} owned size="small" />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography variant="h5">{binder.name}</Typography>
                      <Chip label={binder.rarity} size="small" sx={{ textTransform: 'capitalize' }} />
                    </Stack>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
                          Capacity
                        </Typography>
                        <Typography sx={{ color: 'var(--text-accent)', fontSize: 13, fontWeight: 900 }}>
                          {used} / {binder.capacity}
                        </Typography>
                      </Stack>
                      <LinearProgress color="warning" value={progress} variant="determinate" sx={{ height: 9, borderRadius: 99 }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
                        Estimated Value
                      </Typography>
                      <Typography fontWeight={950} sx={{ color: 'var(--text-accent)', fontSize: 22 }}>
                        {formatPrice(binderValue)}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                        Estimated from Scryfall prices.
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/binders/${ownedBinder.ownedBinderId}`);
                      }}
                      sx={{ mt: 'auto' }}
                      variant="contained"
                    >
                      Open Binder
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
