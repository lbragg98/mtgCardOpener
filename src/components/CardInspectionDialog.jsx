import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { formatPrice, getCardPriceLabel } from '../utils/cardPricing.js';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
import { getRecycleShardValue } from '../utils/recycleValue.js';
import CardImage from './CardImage.jsx';
import InspectableFoilCard from './InspectableFoilCard.jsx';

export default function CardInspectionDialog({
  card,
  onClose,
  onRemoveFromBinder,
  onRecycle,
  open,
  sourceContext,
}) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const foilTreatment = card ? normalizeFoilTreatment(card) : null;
  const isOneOfOne = isOneOfOneRing(card);
  const canRemoveFromBinder = sourceContext === 'binder' && Boolean(onRemoveFromBinder);
  const canRecycle = sourceContext === 'collection' && Boolean(onRecycle) && !isOneOfOne;

  function handleRemoveFromBinder() {
    if (card && onRemoveFromBinder) {
      onRemoveFromBinder(card);
    }
  }

  function handleRecycle() {
    if (card && onRecycle) {
      onRecycle(card);
    }
  }

  function formatCardPrice(value) {
    return value ? formatPrice(value) : 'No price';
  }

  return (
    <Dialog
      className="cardInspectionDialog"
      fullScreen={isMobile}
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      open={open}
    >
      {card && (
        <>
          <DialogTitle>{card.name}</DialogTitle>
          <DialogContent className="cardInspectionDialogContent">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.08fr) minmax(320px, 0.92fr)' },
                gap: { xs: 2.5, md: 4 },
                alignItems: { xs: 'start', md: 'center' },
                minHeight: { xs: 'auto', md: '70vh' },
                overflow: 'visible',
              }}
            >
              <Box
                className="cardInspectionStage"
                sx={{
                  minHeight: { xs: '58vh', md: '70vh' },
                }}
              >
                {card.isFoil ? (
                  <InspectableFoilCard
                    canInspect={card.isFoil}
                    card={card}
                    stableInspection
                    sx={{
                      maxHeight: { xs: '58vh', md: '70vh' },
                      maxWidth: '100%',
                      boxShadow: '0 24px 70px rgba(0, 0, 0, 0.52)',
                      width: { xs: 'min(100%, calc(58vh * 488 / 680))', md: 'min(100%, calc(70vh * 488 / 680))' },
                    }}
                    variant="detail"
                  />
                ) : (
                  <CardImage
                    card={card}
                    large
                    sx={{
                      maxHeight: { xs: '58vh', md: '70vh' },
                      maxWidth: '100%',
                      boxShadow: '0 22px 62px rgba(0, 0, 0, 0.48)',
                      width: { xs: 'min(100%, calc(58vh * 488 / 680))', md: 'min(100%, calc(70vh * 488 / 680))' },
                    }}
                    variant="detail"
                  />
                )}
              </Box>

              <Stack
                spacing={1.5}
                sx={{
                  alignSelf: { xs: 'stretch', md: 'center' },
                  maxHeight: { xs: 'none', md: '70vh' },
                  minWidth: 0,
                  overflowY: { xs: 'visible', md: 'auto' },
                  pr: { md: 1 },
                }}
              >
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip label={card.rarity || 'Unknown rarity'} sx={{ textTransform: 'capitalize', fontWeight: 900 }} />
                  <Chip label={card.isFoil ? 'Foil' : 'Non-foil'} color={card.isFoil ? 'warning' : 'default'} />
                  {card.isFoil && (
                    <Chip color="warning" label={FOIL_LABELS[foilTreatment]} variant="outlined" />
                  )}
                  {card.isCollectorExclusive && (
                    <Chip color="warning" label="Collector Booster Exclusive" variant="filled" />
                  )}
                  {isOneOfOne && <Chip color="warning" label="One of One" variant="outlined" />}
                </Stack>

                <Typography>
                  <strong>Name:</strong> {card.name}
                </Typography>
                <Typography>
                  <strong>Rarity:</strong> {card.rarity || 'Unknown'}
                </Typography>
                <Typography>
                  <strong>Set:</strong> {card.set_name || card.set?.toUpperCase() || 'Unknown'}
                </Typography>
                <Typography>
                  <strong>Collector number:</strong> {card.collector_number || 'Unknown'}
                </Typography>
                <Typography>
                  <strong>Foil status:</strong> {card.isFoil ? 'Foil' : 'Non-foil'}
                </Typography>
                <Typography>
                  <strong>Foil treatment:</strong> {card.isFoil ? FOIL_LABELS[foilTreatment] : 'None'}
                </Typography>
                <Typography>
                  <strong>Collector Booster Exclusive:</strong> {card.isCollectorExclusive ? 'Yes' : 'No'}
                </Typography>
                <Typography>
                  <strong>One of One:</strong> {isOneOfOne ? 'Yes' : 'No'}
                </Typography>
                <Typography>
                  <strong>Estimated value:</strong> {getCardPriceLabel(card)}
                </Typography>
                <Typography>
                  <strong>Normal USD:</strong> {formatCardPrice(card.prices?.usd ?? card.usd)}
                </Typography>
                <Typography>
                  <strong>Foil USD:</strong> {formatCardPrice(card.prices?.usd_foil ?? card.usd_foil)}
                </Typography>
                <Typography>
                  <strong>Etched USD:</strong> {formatCardPrice(card.prices?.usd_etched ?? card.usd_etched)}
                </Typography>
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            {canRecycle && (
              <Button color="warning" onClick={handleRecycle} variant="outlined">
                Recycle for {getRecycleShardValue(card).toLocaleString()} Pack Shards
              </Button>
            )}
            {canRemoveFromBinder && (
              <Button color="error" onClick={handleRemoveFromBinder} startIcon={<DeleteIcon />} variant="outlined">
                Remove from Binder
              </Button>
            )}
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
