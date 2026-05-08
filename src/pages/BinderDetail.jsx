import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, IconButton, Snackbar, Stack, Typography, useMediaQuery } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddCardsToBinderDialog from '../components/AddCardsToBinderDialog.jsx';
import BinderCover from '../components/BinderCover.jsx';
import BinderOpenAnimation from '../components/BinderOpenAnimation.jsx';
import CardImage from '../components/CardImage.jsx';
import CardInspectionDialog from '../components/CardInspectionDialog.jsx';
import { getCollection } from '../utils/collectionStorage.js';
import { getCatalogBinderById } from '../utils/binderCatalog.js';
import { addCardsToBinder, getBinderById, removeCardFromBinder } from '../utils/binderStorage.js';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';

function getBinderPageLayout(capacity) {
  if (capacity <= 2) return { columns: 2, slotsPerPage: 2 };
  if (capacity <= 5) return { columns: 2, slotsPerPage: 5 };
  if (capacity <= 10) return { columns: 2, slotsPerPage: 5 };
  if (capacity <= 15) return { columns: 3, slotsPerPage: 6 };
  if (capacity <= 35) return { columns: 3, slotsPerPage: 9 };
  if (capacity <= 65) return { columns: 4, slotsPerPage: 12 };
  return { columns: 4, slotsPerPage: 16 };
}

export default function BinderDetail() {
  const navigate = useNavigate();
  const { binderId } = useParams();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [ownedBinder, setOwnedBinder] = useState(() => getBinderById(binderId));
  const [collection, setCollection] = useState(() => getCollection());
  const [hasOpened, setHasOpened] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
    ? ownedBinder.cards.map((collectionId) => collectionById.get(collectionId)).filter(Boolean)
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

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, maxPageStart));
  }, [maxPageStart]);

  useEffect(() => {
    window.addEventListener('bindersUpdated', refreshBinderState);
    window.addEventListener('collectionUpdated', refreshBinderState);
    window.addEventListener('storage', refreshBinderState);

    return () => {
      window.removeEventListener('bindersUpdated', refreshBinderState);
      window.removeEventListener('collectionUpdated', refreshBinderState);
      window.removeEventListener('storage', refreshBinderState);
    };
  }, [binderId]);

  function refreshBinderState() {
    setOwnedBinder(getBinderById(binderId));
    setCollection(getCollection());
  }

  function handleAddCards(collectionIds) {
    try {
      const updatedBinder = addCardsToBinder(ownedBinder.ownedBinderId, collectionIds);
      setOwnedBinder(updatedBinder);
      setIsAddDialogOpen(false);
      setSnackbar({
        message: `Added ${collectionIds.length} card${collectionIds.length === 1 ? '' : 's'} to ${binder.name}.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
  }

  function handleRemoveCard(collectionId) {
    try {
      const updatedBinder = removeCardFromBinder(ownedBinder.ownedBinderId, collectionId);
      setOwnedBinder(updatedBinder);
      setSnackbar({ message: `Removed card from ${binder.name}.`, severity: 'success' });
    } catch (error) {
      setSnackbar({ message: error.message, severity: 'error' });
    }
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
              handleRemoveCard(card.collectionId);
              setSelectedCard((currentCard) =>
                currentCard?.collectionId === card.collectionId ? null : currentCard,
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
          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>Slot {slotIndex + 1}</Typography>
        </Box>
      </Box>
    );
  }

  if (!hasOpened) {
    return <BinderOpenAnimation binder={binder} onComplete={() => setHasOpened(true)} />;
  }

  return (
    <Box>
      <Grid container spacing={3} alignItems="stretch" sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BinderCover animated={false} binder={binder} owned size="large" />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'grid', alignContent: 'center', gap: 1.5, height: '100%' }}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Chip label={binder.rarity} sx={{ textTransform: 'capitalize', fontWeight: 900 }} />
                <Chip label={`${binderCards.length} / ${binder.capacity} cards`} color="warning" variant="outlined" />
                <Chip label={`${formatPrice(binderValue)} estimated value`} color="secondary" variant="outlined" />
                <Chip label={binder.theme} variant="outlined" />
              </Stack>
              <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 52 } }}>
                {binder.name}
              </Typography>
              <Typography color="warning.main" fontWeight={950} sx={{ fontSize: { xs: 24, md: 30 } }}>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" gap={1.5} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="h4">Binder Pages</Typography>
              <Typography color="text.secondary" fontWeight={800}>
                {binderCards.length} / {binder.capacity} slots filled
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent={{ xs: 'space-between', sm: 'flex-end' }} gap={1}>
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

          <Box className="binderSpread" sx={{ '--binder-accent': binder.colors.accent }}>
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
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                        <Typography color="warning.main" sx={{ fontSize: 13, fontWeight: 900 }}>
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
          <Stack direction="row" alignItems="center" justifyContent="center" gap={1} sx={{ mt: 2 }}>
            {Array.from({ length: totalPages }).map((_, pageIndex) => (
              <Box
                key={pageIndex}
                onClick={() => goToPage(Math.min(pageIndex, maxPageStart))}
                sx={{
                  width: pageIndex >= currentPage && pageIndex < currentPage + pagesPerView ? 22 : 8,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: pageIndex >= currentPage && pageIndex < currentPage + pagesPerView ? 'warning.main' : 'rgba(248, 247, 255, 0.22)',
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

      <CardInspectionDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onRemoveFromBinder={(cardToRemove) => {
          handleRemoveCard(cardToRemove.collectionId);
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
