// Mobile hand tray uses native horizontal scrolling so card browsing does not fight page gestures.
import { Box, Typography } from '@mui/material';
import BattleCard from './BattleCard.jsx';

export default function MobileHandTray({ cards = [], disabled = false, mana = 0, onInspectCard, onPlayCard }) {
  return (
    <Box className="mobileBattleHandTray">
      <Box className="mobileBattleHandHeader">
        <Typography fontWeight={950} variant="caption">Hand</Typography>
        <Typography color="text.secondary" fontWeight={800} variant="caption">
          {mana} mana
        </Typography>
      </Box>
      <Box className="mobileBattleHandScroller" role="list" aria-label="Cards in hand">
        {cards.length ? cards.map((card) => {
          const isDisabled = disabled || (card.cost || card.battleStats?.cost || 1) > mana;

          return (
            <Box className="mobileBattleHandCard" key={card.instanceId || card.userCardId || card.battleId} role="listitem">
              <BattleCard
                card={card}
                compact
                disabled={isDisabled}
                onClick={() => onPlayCard?.(card)}
                onInspect={onInspectCard}
                playable={!isDisabled}
                size="hand"
              />
            </Box>
          );
        }) : (
          <Box className="mobileBattleHandEmpty">No cards in hand</Box>
        )}
      </Box>
    </Box>
  );
}
