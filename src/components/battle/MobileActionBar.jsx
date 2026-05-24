// Sticky mobile action bar keeps health, mana, targeting cancel, log, and End Turn within thumb reach.
import HistoryIcon from '@mui/icons-material/History';
import { Box, Button, Chip, IconButton, Stack } from '@mui/material';

export default function MobileActionBar({
  activePlayer,
  disabled = false,
  onEndTurn,
  onOpenLog,
  player,
  status,
}) {
  const isPlayerTurn = activePlayer === 'player' && status === 'playing' && !disabled;

  return (
    <Box className="mobileBattleActionBar">
      <Stack direction="row" gap={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Chip color="error" label={`${player.health} HP`} size="small" variant="outlined" />
        <Chip color="warning" label={`${player.mana}/${player.maxMana} mana`} size="small" variant="outlined" />
      </Stack>
      <Stack direction="row" gap={0.75} sx={{ alignItems: 'center' }}>
        <IconButton aria-label="View battle log" onClick={onOpenLog} size="small">
          <HistoryIcon fontSize="small" />
        </IconButton>
        <Button
          aria-label="End turn"
          disabled={!isPlayerTurn}
          onClick={onEndTurn}
          size="small"
          variant="contained"
        >
          End Turn
        </Button>
      </Stack>
    </Box>
  );
}
