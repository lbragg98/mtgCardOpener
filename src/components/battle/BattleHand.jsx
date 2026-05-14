import { Card, CardContent } from '@mui/material';
import BattlefieldZone from './BattlefieldZone.jsx';

export default function BattleHand({ animationSpeed = 1, cards = [], disabled = false, mana = 0, onInspectCard, onPlayCard }) {
  return (
    <Card className="battleHandPanel">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <BattlefieldZone
          animationSpeed={animationSpeed}
          cards={cards}
          getCardDisabled={(card) => disabled || (card.cost || card.battleStats?.cost || 1) > mana}
          onCardClick={onPlayCard}
          onInspectCard={onInspectCard}
          title="Hand"
          zoneType="playerHand"
        />
      </CardContent>
    </Card>
  );
}
