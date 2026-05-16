// Mobile hand tray uses native horizontal scrolling so card browsing does not fight page gestures.
import { Box, Typography } from '@mui/material';
import BattleCard from './BattleCard.jsx';

export default function MobileHandTray({ cards = [], disabled = false, hiddenCardIds = [], mana = 0, onInspectCard, onPlayCard }) {
  const hiddenIds = new Set(hiddenCardIds);
  const visibleCards = cards.filter((card) => !hiddenIds.has(card.instanceId || card.userCardId || card.collectionId || card.battleId));

  return (
    <Box className="mobileBattleHandTray">
      <Box className="mobileBattleHandHeader">
        <Typography fontWeight={950} variant="caption">Hand</Typography>
        <Typography color="text.secondary" fontWeight={800} variant="caption">
          {mana} mana
        </Typography>
      </Box>
      <Box className="mobileBattleHandScroller" role="list" aria-label="Cards in hand">
        {visibleCards.length ? visibleCards.map((card) => {
          const isDisabled = disabled || (card.cost || card.battleStats?.cost || 1) > mana;

          return (
            <Box className="mobileBattleHandCard" key={card.instanceId || card.userCardId || card.battleId} role="listitem">
              <BattleCard
                card={card}
                compact
                disabled={isDisabled}
                onClick={(event) => onPlayCard?.(card, event)}
                onInspect={onInspectCard}
                playable={!isDisabled}
                size="hand"
              />
            </Box>
          );
        }) : (
          <Box className="mobileBattleHandEmpty">No cards in hand.</Box>
        )}
      </Box>
    </Box>
  );
}
