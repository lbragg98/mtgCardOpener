// Duplicate Manager helps recycle extra copies in bulk while protecting one-of-one cards.
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyCards, recycleUserCards } from '../api/userCards.js';
import CardImage from '../components/CardImage.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import {
  cardMatchesDuplicateFilter,
  getCardDuplicateId,
  getDuplicateGroups,
} from '../utils/duplicates.js';
import { getCollection, getPackShards, recycleCards } from '../utils/collectionStorage.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
import { getRecycleShardValue } from '../utils/recycleValue.js';

const FILTER_ACTIONS = [
  ['commons', 'Commons'],
  ['uncommons', 'Uncommons'],
  ['rares', 'Rares'],
  ['mythics', 'Mythics'],
  ['nonfoils', 'Non-foils only'],
  ['foils', 'Foils only'],
  ['under1', 'Under $1'],
  ['under5', 'Under $5'],
];

export default function Duplicates() {
  const { user } = useAuth();
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRecycling, setIsRecycling] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });

  async function loadCollection() {
    try {
      setIsLoading(true);
      setCollection(user ? await getMyCards() : getCollection());
    } catch (error) {
      setSnackbar({ message: error.message || 'Duplicate cards could not be loaded. Please try again.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCollection();
  }, [user]);

  const duplicateGroups = useMemo(() => getDuplicateGroups(collection), [collection]);
  const selectableExtras = useMemo(
    // Auto-selection never includes protected one-of-one cards.
    () => duplicateGroups.flatMap((group) => group.extras).filter((card) => !isOneOfOneRing(card)),
    [duplicateGroups],
  );
  const selectableIds = useMemo(() => new Set(selectableExtras.map(getCardDuplicateId)), [selectableExtras]);
  const selectedCards = useMemo(
    () => selectableExtras.filter((card) => selectedIds.includes(getCardDuplicateId(card))),
    [selectableExtras, selectedIds],
  );
  const extraCount = selectableExtras.length;
  const totalPossibleShards = selectableExtras.reduce((total, card) => total + getRecycleShardValue(card), 0);
  const selectedShardTotal = selectedCards.reduce((total, card) => total + getRecycleShardValue(card), 0);

  function setSelectedExtras(cards) {
    setSelectedIds([...new Set(cards.map(getCardDuplicateId).filter((id) => selectableIds.has(id)))]);
  }

  function toggleCard(card) {
    const id = getCardDuplicateId(card);

    if (!selectableIds.has(id)) {
      return;
    }

    setSelectedIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id],
    );
  }

  function toggleGroup(group) {
    const groupIds = group.extras.filter((card) => !isOneOfOneRing(card)).map(getCardDuplicateId);
    const allSelected = groupIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) =>
      allSelected
        ? currentIds.filter((id) => !groupIds.includes(id))
        : [...new Set([...currentIds, ...groupIds])],
    );
  }

  async function handleRecycleSelected() {
    if (!selectedIds.length || isRecycling) {
      return;
    }

    setIsRecycling(true);

    try {
      const result = user ? await recycleUserCards(selectedIds) : recycleCards(selectedIds);
      setCollection(user ? await getMyCards() : result.updatedCollection);
      setSelectedIds([]);
      setConfirmOpen(false);
      setSnackbar({
        message: `Recycled ${(result.recycledCount || result.recycledCards.length).toLocaleString()} duplicate cards for ${result.shardsAwarded.toLocaleString()} Pack Shards.`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({ message: error.message || 'Selected duplicates could not be recycled. Please try again.', severity: 'error' });
    } finally {
      setIsRecycling(false);
    }
  }

  return (
    <Box>
      <PageHeader eyebrow="Duplicates" title="Duplicate Manager">
        Keep one copy of each duplicate group and recycle selected extras for Pack Shards.
      </PageHeader>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            <Chip color="warning" label={`${duplicateGroups.length} duplicate groups`} variant="outlined" />
            <Chip color="secondary" label={`${extraCount} extra cards`} variant="outlined" />
            <Chip label={`${totalPossibleShards.toLocaleString()} possible Pack Shards`} variant="outlined" />
            <Chip label={`${getPackShards().toLocaleString()} current Pack Shards`} variant="outlined" />
          </Stack>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            <Button disabled={!extraCount} onClick={() => setSelectedExtras(selectableExtras)} variant="contained">
              Select All Extras
            </Button>
            <Button disabled={!selectedIds.length} onClick={() => setSelectedIds([])} variant="outlined">
              Clear Selection
            </Button>
            <Button
              color="warning"
              disabled={!selectedIds.length}
              onClick={() => setConfirmOpen(true)}
              startIcon={<DeleteIcon />}
              variant="contained"
            >
              Recycle Selected ({selectedShardTotal.toLocaleString()})
            </Button>
            <Button component={Link} to="/collection" variant="outlined">
              Back to Collection
            </Button>
          </Stack>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            {FILTER_ACTIONS.map(([filter, label]) => (
              <Button
                disabled={!extraCount}
                key={filter}
                onClick={() => setSelectedExtras(selectableExtras.filter((card) => cardMatchesDuplicateFilter(card, filter)))}
                size="small"
                variant="outlined"
              >
                Select {label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {isLoading && <Alert severity="info">Finding duplicate cards...</Alert>}

      {!isLoading && !duplicateGroups.length && (
        <Card>
          <CardContent sx={{ display: 'grid', gap: 2, justifyItems: 'center', py: 7, textAlign: 'center' }}>
            <AutoAwesomeIcon color="warning" sx={{ fontSize: 54 }} />
            <Typography variant="h4">No duplicate extras found</Typography>
            <Typography color="text.secondary">You are already keeping one copy of each card variant.</Typography>
          </CardContent>
        </Card>
      )}

      {duplicateGroups.map((group) => {
        const groupSelectableIds = group.extras.filter((card) => !isOneOfOneRing(card)).map(getCardDuplicateId);
        const allGroupSelected = groupSelectableIds.length > 0 && groupSelectableIds.every((id) => selectedIds.includes(id));
        const representativeCard = group.keepCard;

        return (
          <Accordion key={group.key} sx={{ mb: 1.5 }}>
            <AccordionSummary>
              <Stack direction="row" gap={1.5} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
                <Box sx={{ width: 58, flexShrink: 0 }}>
                  <CardImage card={representativeCard} variant="grid" />
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography fontWeight={950} noWrap>{representativeCard.name}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    {representativeCard.rarity} - {FOIL_LABELS[normalizeFoilTreatment(representativeCard)] || 'Non-foil'} - {group.cards.length} owned
                  </Typography>
                  <Typography color="warning.main" sx={{ fontSize: 13, fontWeight: 900 }}>
                    {group.extras.length} extras - {group.totalRecycleValue.toLocaleString()} Pack Shards
                  </Typography>
                </Box>
                <Checkbox
                  checked={allGroupSelected}
                  disabled={!groupSelectableIds.length}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroup(group);
                  }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Alert severity="info" variant="outlined">
                  Keeping the oldest copy from {representativeCard.openedAt ? new Date(representativeCard.openedAt).toLocaleDateString() : 'an unknown date'}.
                </Alert>
                {group.cards.map((card) => {
                  const id = getCardDuplicateId(card);
                  const isKeepCard = id === getCardDuplicateId(group.keepCard);
                  const protectedCard = isOneOfOneRing(card);
                  const selected = selectedIds.includes(id);

                  return (
                    <Stack
                      direction="row"
                      gap={1.5}
                      key={id}
                      sx={{ alignItems: 'center', border: '1px solid rgba(248, 247, 255, 0.12)', borderRadius: 1, p: 1 }}
                    >
                      <Checkbox
                        checked={selected}
                        disabled={isKeepCard || protectedCard}
                        onChange={() => toggleCard(card)}
                      />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography fontWeight={900} noWrap>
                          {isKeepCard ? 'Keep copy' : protectedCard ? 'Protected copy' : 'Extra copy'}
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          {card.openedAt ? new Date(card.openedAt).toLocaleString() : 'Unknown date'} · {formatPrice(getCardPrice(card))}
                        </Typography>
                      </Box>
                      <Chip
                        color={protectedCard ? 'warning' : 'default'}
                        label={protectedCard ? 'One-of-One protected' : `${getRecycleShardValue(card).toLocaleString()} Pack Shards`}
                        variant="outlined"
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Dialog fullWidth maxWidth="sm" onClose={() => setConfirmOpen(false)} open={confirmOpen}>
        <DialogTitle>Recycle selected duplicates?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            This removes only the selected card copies from your collection. One copy from each duplicate group is kept by default.
          </Typography>
          <Typography fontWeight={950}>
            Recycle {selectedCards.length.toLocaleString()} cards for {selectedShardTotal.toLocaleString()} Pack Shards?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button disabled={isRecycling} onClick={() => setConfirmOpen(false)} variant="outlined">Cancel</Button>
          <Button color="warning" disabled={isRecycling || !selectedIds.length} onClick={handleRecycleSelected} variant="contained">
            Recycle Selected
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={3600} onClose={() => setSnackbar({ message: '', severity: 'success' })} open={Boolean(snackbar.message)}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
