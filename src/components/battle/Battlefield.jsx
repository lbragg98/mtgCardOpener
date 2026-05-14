import { Card, CardContent } from '@mui/material';
import BattlefieldZone from './BattlefieldZone.jsx';

export default function Battlefield({ animationSpeed = 1, cards = [], getCardDisabled, onCardClick, onInspectCard, selectable = false, title = 'Battlefield' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <BattlefieldZone
          animationSpeed={animationSpeed}
          cards={cards}
          getCardDisabled={getCardDisabled}
          onCardClick={onCardClick}
          onInspectCard={onInspectCard}
          selectable={selectable}
          title={title}
          zoneType="playerBattlefield"
        />
      </CardContent>
    </Card>
  );
}
