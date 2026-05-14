import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import BattleCard from './BattleCard.jsx';

export default function TargetPickerDialog({
  actionLabel = 'Choose Target',
  onClose,
  onSelectTarget,
  open,
  targets = [],
}) {
  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle sx={{ alignItems: 'center', display: 'flex', gap: 1, justifyContent: 'space-between' }}>
        {actionLabel}
        <IconButton aria-label="Close target picker" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
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
