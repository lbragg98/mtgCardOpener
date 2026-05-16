// Target picker makes spell/attack choices explicit, especially on touch screens.
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import BattleCard from './BattleCard.jsx';

export default function TargetPickerDialog({
  actionLabel = 'Choose target',
  onClose,
  onSelectTarget,
  open,
  targets = [],
}) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  return (
    <Dialog fullScreen={isMobile} fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle sx={{ alignItems: 'center', display: 'flex', gap: 1, justifyContent: 'space-between' }}>
        {actionLabel}
        <IconButton aria-label="Close target picker" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pb: { xs: 3, sm: 2 } }}>
        <Typography color="text.secondary" variant="body2">
          Glowing options are valid targets. Choose one or cancel.
        </Typography>
        {!targets.length ? (
          <Typography color="text.secondary">No valid targets are available.</Typography>
        ) : (
          <Stack gap={1.5}>
            {targets.map((target) => (
              <Box key={target.id}>
                {target.card ? (
                  <BattleCard
                    card={target.card}
                    compact
                    onClick={() => onSelectTarget(target.value)}
                    selectable
                    size={isMobile ? 'hand' : 'battlefield'}
                  />
                ) : (
                  <Button fullWidth onClick={() => onSelectTarget(target.value)} size="large" variant="outlined">
                    {target.label}
                  </Button>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
