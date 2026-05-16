import CloseIcon from '@mui/icons-material/Close';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PaidIcon from '@mui/icons-material/Paid';
import ShieldIcon from '@mui/icons-material/Shield';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { formatPrice, getCardPrice } from '../../utils/cardPricing.js';
import { FOIL_LABELS, normalizeFoilTreatment } from '../../utils/foilTypes.js';
import { getBattleCardEffectSummary } from '../../utils/battleCardMapper.js';
import CardImage from '../CardImage.jsx';
import InspectableFoilCard from '../InspectableFoilCard.jsx';

function getEffectSummary(card) {
  return getBattleCardEffectSummary(card);
}

export default function BattleCardInspectionDialog({ card, onClose, open, showOfficialText = true }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const foilTreatment = card ? normalizeFoilTreatment(card) : null;
  const estimatedValue = card ? getCardPrice(card) || getCardPrice(card.sourceCard) : null;

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
          <DialogTitle sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            {card.name}
            <IconButton aria-label="Close inspection" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent className="cardInspectionDialogContent">
            <Box
              sx={{
                alignItems: { xs: 'start', md: 'center' },
                display: 'grid',
                gap: { xs: 2.5, md: 4 },
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)' },
                minHeight: { xs: 'auto', md: '70vh' },
                overflow: 'visible',
              }}
            >
              <Box className="cardInspectionStage" sx={{ minHeight: { xs: '58vh', md: '70vh' } }}>
                {card.isFoil ? (
                  <InspectableFoilCard
                    canInspect={card.isFoil}
                    card={card}
                    stableInspection
                    sx={{
                      boxShadow: '0 24px 70px rgba(0, 0, 0, 0.52)',
                      maxHeight: { xs: '58vh', md: '70vh' },
                      maxWidth: '100%',
                      width: { xs: 'min(100%, calc(58vh * 488 / 680))', md: 'min(100%, calc(70vh * 488 / 680))' },
                    }}
                    variant="detail"
                  />
                ) : (
                  <CardImage
                    card={card}
                    large
                    sx={{
                      boxShadow: '0 22px 62px rgba(0, 0, 0, 0.48)',
                      maxHeight: { xs: '58vh', md: '70vh' },
                      maxWidth: '100%',
                      width: { xs: 'min(100%, calc(58vh * 488 / 680))', md: 'min(100%, calc(70vh * 488 / 680))' },
                    }}
                    variant="detail"
                  />
                )}
              </Box>

              <Stack spacing={1.5} sx={{ maxHeight: { xs: 'none', md: '70vh' }, overflowY: { xs: 'visible', md: 'auto' }, pr: { md: 1 } }}>
                <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip label={card.displayType || card.type || 'Battle card'} />
                  <Chip label={card.rarity || 'common'} sx={{ textTransform: 'capitalize' }} />
                  <Chip label={`${card.colorSignature || card.primaryColor || 'C'} ${card.colorName || ''}`.trim()} variant="outlined" />
                  {card.isFoil && <Chip color="warning" label={FOIL_LABELS[foilTreatment] || 'Foil'} />}
                </Stack>

                <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip icon={<PaidIcon />} label={`Cost ${card.cost || 1}`} variant="outlined" />
                  {card.type === 'creature' && (
                    <>
                      <Chip color="warning" icon={<LocalFireDepartmentIcon />} label={`Attack ${card.attack || 0}`} variant="outlined" />
                      <Chip color="secondary" icon={<ShieldIcon />} label={`Health ${card.currentHealth ?? card.health}/${card.health || card.maxHealth || 0}`} variant="outlined" />
                    </>
                  )}
                </Stack>

                <Typography><strong>Simplified effect:</strong> {getEffectSummary(card)}</Typography>
                <Typography><strong>Color strategy:</strong> {card.colorStrategy || 'Flexible modest utility'}</Typography>
                <Typography><strong>Original power/toughness:</strong> {card.originalPower ?? 'N/A'} / {card.originalToughness ?? 'N/A'}</Typography>
                <Typography><strong>Keywords:</strong> {card.keywords?.length ? card.keywords.join(', ') : 'None'}</Typography>
                <Typography><strong>Foil treatment:</strong> {card.isFoil ? FOIL_LABELS[foilTreatment] || foilTreatment : 'None'}</Typography>
                <Typography><strong>Set:</strong> {card.setName || card.set_name || card.setCode || card.set || 'Unknown'}</Typography>
                <Typography><strong>Estimated value:</strong> {estimatedValue ? formatPrice(estimatedValue) : 'No price available'}</Typography>
                {showOfficialText && (
                  <Typography sx={{ whiteSpace: 'pre-line' }}>
                    <strong>Oracle text:</strong> {card.oracleText || card.sourceCard?.oracle_text || 'No oracle text available.'}
                  </Typography>
                )}
              </Stack>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
