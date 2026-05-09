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
} from '@mui/material';
import { formatPrice, getCardPriceLabel } from '../utils/cardPricing.js';
import { isOneOfOneRing } from '../utils/collectorExclusiveCards.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../utils/foilTypes.js';
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
  const foilTreatment = card ? normalizeFoilTreatment(card) : null;
  const isOneOfOne = isOneOfOneRing(card);
  const canRemoveFromBinder = sourceContext === 'binder' && Boolean(onRemoveFromBinder);
  const canRecycle = sourceContext === 'collection' && Boolean(onRecycle);

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
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      {card && (
        <>
          <DialogTitle>{card.name}</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 380px) minmax(0, 1fr)' },
                gap: { xs: 2.5, md: 3 },
                alignItems: 'start',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  justifyItems: 'center',
                  mx: 'auto',
                  width: '100%',
                  maxWidth: { xs: 340, sm: 380 },
                }}
              >
                {card.isFoil ? (
                  <InspectableFoilCard
                    canInspect={card.isFoil}
                    card={card}
                    sx={{
                      position: 'relative',
                      width: '100%',
                      boxShadow: '0 24px 70px rgba(0, 0, 0, 0.52)',
                    }}
                    variant="detail"
                  />
                ) : (
                  <CardImage
                    card={card}
                    large
                    sx={{
                      position: 'relative',
                      width: '100%',
                      boxShadow: '0 22px 62px rgba(0, 0, 0, 0.48)',
                    }}
                    variant="detail"
                  />
                )}
              </Box>

              <Stack spacing={1.5}>
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
                Recycle for 25 Pack Shards
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
