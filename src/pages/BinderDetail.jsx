import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addCardsToBinder as addCloudCardsToBinder,
  getBinderCards as getCloudBinderCards,
  getOwnedBinderById as getCloudOwnedBinderById,
  removeCardFromBinder as removeCloudCardFromBinder,
  updateBinderCosmetics as updateCloudBinderCosmetics,
} from '../api/binders.js';
import { getMyCards } from '../api/userCards.js';
import AddCardsToBinderDialog from '../components/AddCardsToBinderDialog.jsx';
import BinderCover from '../components/BinderCover.jsx';
import BinderOpenAnimation from '../components/BinderOpenAnimation.jsx';
import CardImage from '../components/CardImage.jsx';
import CardInspectionDialog from '../components/CardInspectionDialog.jsx';
import CardSleeve from '../components/CardSleeve.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCosmetics } from '../context/CosmeticsContext.jsx';
import { getCollection } from '../utils/collectionStorage.js';
import { getCatalogBinderById } from '../utils/binderCatalog.js';
import {
  addCardsToBinder as addLocalCardsToBinder,
  getBinderById,
  removeCardFromBinder as removeLocalCardFromBinder,
  updateBinderCosmetics as updateLocalBinderCosmetics,
} from '../utils/binderStorage.js';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';
import { SHOP_CATEGORIES } from '../utils/shopCatalog.js';

function getBinderPageLayout(capacity) {
  if (capacity <= 2) return { columns: 2, slotsPerPage: 2 };
  if (capacity <= 5) return { columns: 2, slotsPerPage: 5 };
  if (capacity <= 10) return { columns: 2, slotsPerPage: 5 };
  if (capacity <= 15) return { columns: 3, slotsPerPage: 6 };
  if (capacity <= 35) return { columns: 3, slotsPerPage: 9 };
  if (capacity <= 65) return { columns: 4, slotsPerPage: 12 };
  return { columns: 4, slotsPerPage: 16 };
}

const BINDER_COSMETIC_SLOTS = [
  { key: 'equippedClaspId', label: 'Clasp', slot: 'binderClasp' },
  { key: 'equippedPageStyleId', label: 'Page Background', slot: 'binderPageStyle' },
  { key: 'equippedSlotFrameId', label: 'Slot Frame', slot: 'binderSlotFrame' },
  { key: 'equippedAuraId', label: 'Binder Aura', slot: 'binderAura' },
];

export default function BinderDetail() {
  const navigate = useNavigate();
  const { binderId } = useParams();
  const { user } = useAuth();
  const { getEquippedItem, ownedItems } = useCosmetics();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [ownedBinder, setOwnedBinder] = useState(null);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOpened, setHasOpened] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [customizingCosmetics, setCustomizingCosmetics] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageDirection, setPageDirection] = useState(1);
  const [selectedCard, setSelectedCard] = useState(null);
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const collectionById = useMemo(
    () => new Map(collection.map((card) => [card.collectionId, card])),
    [collection],
  );
  const binder = ownedBinder ? getCatalogBinderById(ownedBinder.binderId) : null;
  const pageLayout = getBinderPageLayout(binder?.capacity || 2);
  const binderCards = ownedBinder
    ? user
      ? ownedBinder.binderCards || []
      : ownedBinder.cards.map((collectionId) => collectionById.get(collectionId)).filter(Boolean)
    : [];
  const binderValue = useMemo(
    () => binderCards.reduce((total, card) => total + getCardPrice(card), 0),
    [binderCards],
  );
  const emptySlots = binder ? Math.max(binder.capacity - binderCards.length, 0) : 0;
  const slots = binder ? Array.from({ length: binder.capacity }, (_, index) => binderCards[index] || null) : [];
  const totalPages = binder ? Math.max(Math.ceil(binder.capacity / pageLayout.slotsPerPage), 1) : 1;
  const pagesPerView = isMobile ? 1 : 2;
  const maxPageStart = Math.max(totalPages - pagesPerView, 0);
  const visiblePageIndexes = Array.from({ length: pagesPerView }, (_, index) => currentPage + index).filter(
    (pageIndex) => pageIndex < totalPages,
  );
  const pageLabel =
    pagesPerView === 1 || visiblePageIndexes.length === 1
      ? `Page ${currentPage + 1} / ${totalPages}`
      : `Pages ${currentPage + 1}-${visiblePageIndexes[visiblePageIndexes.length - 1] + 1} / ${totalPages}`;
  const equippedSleeve = getEquippedItem('cardSleeve');
  const sleeveId = equippedSleeve?.id;
  const binderCosmetics = {
    claspId: ownedBinder?.equippedClaspId || '',
    pageStyleId: ownedBinder?.equippedPageStyleId || '',
    slotFrameId: ownedBinder?.equippedSlotFrameId || '',
    auraId: ownedBinder?.equippedAuraId || '',
  };
  const displayBinder = binder ? { ...binder, cosmetics: binderCosmetics } : null;
  const ownedBinderCosmetics = useMemo(
    () => ownedItems.filter((item) => item.category === SHOP_CATEGORIES.BINDER_COSMETICS),
    [ownedItems],
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, maxPageStart));
  }, [maxPageStart]);

  useEffect(() => {
    let isMounted = true;

    async function loadBinderState() {
      try {
        setIsLoading(true);

        if (user) {
          const [cloudBinder, cloudCollection, cloudBinderCards] = await Promise.all([
            getCloudOwnedBinderById(binderId),
            getMyCards(),
            getCloudBinderCards(binderId),
          ]);

          if (isMounted) {
            setOwnedBinder(
              cloudBinder
                ? {
                    ...cloudBinder,
                    cards: cloudBinderCards.map((card) => card.userCardId || card.collectionId),
                    binderCards: cloudBinderCards,
                  }
                : null,
            );
            setCollection(cloudCollection);
          }

          return;
        }

        if (isMounted) {
          setOwnedBinder(getBinderById(binderId));
          setCollection(getCollection());
        }
      } catch (error) {
        if (isMounted) {
          setSnackbar({ message: error.message || 'Unable to load binder.', severity: 'error' });
          setOwnedBinder(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBinderState();

    window.addEventListener('bindersUpdated', refreshBinderState);
    window.addEventListener('collectionUpdated', refreshBinderState);
    window.addEventListener('storage', refreshBinderState);

    return () => {
      isMounted = false;
      window.removeEventListener('bindersUpdated', refreshBinderState);
      window.removeEventListener('collectionUpdated', refreshBinderState);
      window.removeEventListener('storage', refreshBinderState);
    };
  }, [binderId, user]);

  async function refreshBinderState() {
    if (user) {
      const [cloudBinder, cloudCollection, cloudBinderCards] = await Promise.all([
        getCloudOwnedBinderById(binderId),
        getMyCards(),
        getCloudBinderCards(binderId),
      ]);

      setOwnedBinder(
        cloudBinder
          ? {
              ...cloudBinder,
              cards: cloudBinderCards.map((card) => card.userCardId || card.collectionId),
              binderCards: cloudBinderCards,
            }
          : null,
      );
      setCollection(cloudCollection);
      return;
    }

    setOwnedBinder(getBinderById(binderId));
    setCollection(getCollection());
  }

  async function handleAddCards(collectionIds) {
    try {
      const updatedBinder = user
        ? await addCloudCardsToBinder(ownedBinder.ownedBinderId, collectionIds)
        : addLocalCardsToBinder(ownedBinder.ownedBinderId, collectionIds);

      if (user) {
        await refreshBinderState();
      } else {
        setOwnedBinder(updatedBinder);
      }

      setIsAddDialogOpen(false);
      setSnackbar({
        message: `Added ${collectionIds.length} card${collectionIds.length === 1 ? '' : 's'} to ${binder.name}.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
  }

  async function handleRemoveCard(collectionId) {
    try {
      const updatedBinder = user
        ? await removeCloudCardFromBinder(ownedBinder.ownedBinderId, collectionId)
        : removeLocalCardFromBinder(ownedBinder.ownedBinderId, collectionId);

      if (user) {
        await refreshBinderState();
      } else {
        setOwnedBinder(updatedBinder);
      }

      setSnackbar({ message: `Removed card from ${binder.name}.`, severity: 'success' });
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
  }

  function openCustomizeBinder() {
    setCustomizingCosmetics({
      equippedClaspId: ownedBinder?.equippedClaspId || '',
      equippedPageStyleId: ownedBinder?.equippedPageStyleId || '',
      equippedSlotFrameId: ownedBinder?.equippedSlotFrameId || '',
      equippedAuraId: ownedBinder?.equippedAuraId || '',
    });
    setIsCustomizeOpen(true);
  }

  async function handleSaveBinderCosmetics() {
    try {
      const updatedBinder = user
        ? await updateCloudBinderCosmetics(ownedBinder.ownedBinderId, customizingCosmetics)
        : updateLocalBinderCosmetics(ownedBinder.ownedBinderId, customizingCosmetics);

      if (user) {
        await refreshBinderState();
      } else {
        setOwnedBinder(updatedBinder);
      }

      setIsCustomizeOpen(false);
      setSnackbar({ message: 'Binder cosmetics updated.', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: error.message || 'Unable to update binder cosmetics.', severity: 'error' });
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ py: 7, textAlign: 'center' }}>
          <Typography color="text.secondary">Loading binder...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!ownedBinder || !binder) {
    return (
      <Card>
        <CardContent sx={{ display: 'grid', gap: 2, justifyItems: 'center', py: 7, textAlign: 'center' }}>
          <CollectionsBookmarkIcon color="warning" sx={{ fontSize: 58 }} />
          <Typography variant="h4">Binder not found</Typography>
          <Typography color="text.secondary">This binder may not exist or may not be owned yet.</Typography>
          <Button onClick={() => navigate('/binders')} variant="contained">
            Back to Binders
          </Button>
        </CardContent>
      </Card>
    );
  }

  function goToPage(nextPage) {
    const clampedPage = Math.min(Math.max(nextPage, 0), maxPageStart);

    if (clampedPage === currentPage) {
      return;
    }

    setPageDirection(clampedPage > currentPage ? 1 : -1);
    setCurrentPage(clampedPage);
  }

  function renderSlot(card, slotIndex) {
    if (card) {
      return (
        <Box
          className="binderSleeveSlot binderSleeveSlot-filled"
          onClick={() => setSelectedCard(card)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setSelectedCard(card);
            }
          }}
          role="button"
          tabIndex={0}
          sx={{ '--binder-accent': binder.colors.accent, cursor: 'pointer' }}
        >
          <CardImage card={card} variant="grid" />
          <IconButton
            aria-label={`Remove ${card.name} from binder`}
            className="binderSlotRemove"
            onClick={(event) => {
              event.stopPropagation();
              handleRemoveCard(card.userCardId || card.collectionId);
              setSelectedCard((currentCard) =>
                (currentCard?.userCardId || currentCard?.collectionId) === (card.userCardId || card.collectionId)
                  ? null
                  : currentCard,
              );
            }}
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      );
    }

    return (
      <Box
        className="binderSleeveSlot"
        onClick={() => setIsAddDialogOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsAddDialogOpen(true);
          }
        }}
        sx={{ '--binder-accent': binder.colors.accent, cursor: 'pointer' }}
      >
        <Box className="binderSleevePocket">
          <CardSleeve sleeveId={sleeveId} size="small" />
          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>Slot {slotIndex + 1}</Typography>
        </Box>
      </Box>
    );
  }

  if (!hasOpened) {
    return <BinderOpenAnimation binder={displayBinder} onComplete={() => setHasOpened(true)} />;
  }

  return (
    <Box>
      <Grid container spacing={3} sx={{ alignItems: 'stretch', mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BinderCover animated={false} binder={displayBinder} owned size="large" />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'grid', alignContent: 'center', gap: 1.5, height: '100%' }}>
              <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
                <Chip label={binder.rarity} sx={{ textTransform: 'capitalize', fontWeight: 900 }} />
                <Chip label={`${binderCards.length} / ${binder.capacity} cards`} color="warning" variant="outlined" />
                <Chip label={`${formatPrice(binderValue)} estimated value`} color="secondary" variant="outlined" />
                <Chip label={binder.theme} variant="outlined" />
              </Stack>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 52 } }}>
                {binder.name}
              </Typography>
              <Typography fontWeight={950} sx={{ color: 'var(--text-accent)', fontSize: { xs: 24, md: 30 } }}>
                {formatPrice(binderValue)}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
                Estimated from Scryfall prices.
              </Typography>
              <Typography color="text.secondary">{binder.description}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <Button disabled={emptySlots <= 0} onClick={() => setIsAddDialogOpen(true)} startIcon={<AddIcon />} variant="contained">
                  Add Cards
                </Button>
                <Button onClick={openCustomizeBinder} variant="contained">
                  Customize Binder
                </Button>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/binders')} variant="outlined">
                  Back to Binders
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card
        sx={{
          borderColor: `${binder.colors.accent}55`,
          background:
            `radial-gradient(circle at 18% 10%, ${binder.colors.accent}18, transparent 26rem), ` +
            `linear-gradient(145deg, rgba(12, 14, 26, 0.98), ${binder.colors.secondary}ee)`,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap', mb: 2.5 }}>
            <Box>
              <Typography variant="h4">Binder Pages</Typography>
              <Typography color="text.secondary" fontWeight={800}>
                {binderCards.length} / {binder.capacity} slots filled
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent={{ xs: 'space-between', sm: 'flex-end' }} gap={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
              <Button
                disabled={currentPage === 0}
                onClick={() => goToPage(currentPage - pagesPerView)}
                startIcon={<KeyboardArrowLeftIcon />}
                variant="outlined"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Previous Page
              </Button>
              <Chip color="warning" label={pageLabel} sx={{ alignSelf: { xs: 'center', sm: 'auto' }, fontWeight: 900 }} variant="outlined" />
              <Button
                disabled={currentPage >= maxPageStart}
                endIcon={<KeyboardArrowRightIcon />}
                onClick={() => goToPage(currentPage + pagesPerView)}
                variant="outlined"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Next Page
              </Button>
            </Stack>
          </Stack>

          <Box
            className={[
              'binderSpread',
              binderCosmetics.pageStyleId ? `binderPageStyle-${binderCosmetics.pageStyleId}` : '',
              binderCosmetics.slotFrameId ? `binderSlotFrame-${binderCosmetics.slotFrameId}` : '',
              binderCosmetics.auraId ? `binderAuraCosmetic-${binderCosmetics.auraId}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            sx={{ '--binder-accent': binder.colors.accent }}
          >
            <AnimatePresence custom={pageDirection} mode="wait">
              <Box
                className="binderSpreadMotion"
                component={motion.div}
                custom={pageDirection}
                key={`${currentPage}-${pagesPerView}`}
                initial={{ opacity: 0, rotateY: pageDirection > 0 ? 10 : -10, x: pageDirection > 0 ? 42 : -42 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: pageDirection > 0 ? -10 : 10, x: pageDirection > 0 ? -42 : 42 }}
                transition={{ duration: isMobile ? 0.28 : 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                {visiblePageIndexes.map((pageIndex, spreadIndex) => {
                  const start = pageIndex * pageLayout.slotsPerPage;
                  const pageSlots = slots.slice(start, start + pageLayout.slotsPerPage);
                  const isLeftPage = !isMobile && spreadIndex === 0;

                  return (
                    <Box
                      className={['binderPageSheet', isLeftPage ? 'binderPageSheet-left' : 'binderPageSheet-right'].join(' ')}
                      key={pageIndex}
                      sx={{ '--binder-accent': binder.colors.accent }}
                    >
                      <Stack direction="row" justifyContent="space-between" sx={{ alignItems: 'center', mb: 1.25 }}>
                        <Typography sx={{ color: 'var(--text-accent)', fontSize: 13, fontWeight: 900 }}>
                          Page {pageIndex + 1}
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
                          {pageSlots.filter(Boolean).length} / {pageLayout.slotsPerPage}
                        </Typography>
                      </Stack>
                      <Box
                        className="binderPageGrid"
                        sx={{
                          gridTemplateColumns: {
                            xs: `repeat(${Math.min(pageLayout.columns, 2)}, minmax(0, 1fr))`,
                            sm: `repeat(${pageLayout.columns}, minmax(0, 1fr))`,
                          },
                        }}
                      >
                        {pageSlots.map((card, index) => (
                          <Box key={`${pageIndex}-${index}`}>{renderSlot(card, start + index)}</Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </AnimatePresence>
          </Box>
          <Stack direction="row" justifyContent="center" gap={1} sx={{ alignItems: 'center', mt: 2 }}>
            {Array.from({ length: totalPages }).map((_, pageIndex) => (
              <Box
                key={pageIndex}
                onClick={() => goToPage(Math.min(pageIndex, maxPageStart))}
                sx={{
                  width: pageIndex >= currentPage && pageIndex < currentPage + pagesPerView ? 22 : 8,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: pageIndex >= currentPage && pageIndex < currentPage + pagesPerView ? 'var(--text-accent)' : 'rgba(248, 247, 255, 0.22)',
                  cursor: 'pointer',
                  transition: 'width 160ms ease, background-color 160ms ease',
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <AddCardsToBinderDialog
        binder={binder}
        collection={collection}
        onAddCards={handleAddCards}
        onClose={() => {
          refreshBinderState();
          setIsAddDialogOpen(false);
        }}
        open={isAddDialogOpen}
        ownedBinder={ownedBinder}
      />

      <Dialog maxWidth="sm" fullWidth onClose={() => setIsCustomizeOpen(false)} open={isCustomizeOpen}>
        <DialogTitle>Customize Binder</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {ownedBinderCosmetics.length === 0 && (
            <Alert severity="info" variant="outlined">
              Buy binder cosmetics from the Shop to customize this binder.
            </Alert>
          )}
          {BINDER_COSMETIC_SLOTS.map((slot) => {
            const options = ownedBinderCosmetics.filter((item) => item.equipSlot === slot.slot);

            return (
              <TextField
                key={slot.key}
                disabled={!options.length}
                fullWidth
                label={slot.label}
                onChange={(event) =>
                  setCustomizingCosmetics((current) => ({
                    ...(current || {}),
                    [slot.key]: event.target.value,
                  }))
                }
                select
                value={customizingCosmetics?.[slot.key] || ''}
              >
                <MenuItem value="">None</MenuItem>
                {options.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            );
          })}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setIsCustomizeOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button disabled={!customizingCosmetics} onClick={handleSaveBinderCosmetics} variant="contained">
            Save Cosmetics
          </Button>
        </DialogActions>
      </Dialog>

      <CardInspectionDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onRemoveFromBinder={(cardToRemove) => {
          handleRemoveCard(cardToRemove.userCardId || cardToRemove.collectionId);
          setSelectedCard(null);
        }}
        open={Boolean(selectedCard)}
        sourceContext="binder"
      />

      <Snackbar autoHideDuration={2800} onClose={() => setSnackbar({ message: '', severity: 'success' })} open={Boolean(snackbar.message)}>
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
