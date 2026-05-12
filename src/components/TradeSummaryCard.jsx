import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useCosmetics } from '../context/CosmeticsContext.jsx';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';
import CardSleeve from './CardSleeve.jsx';
import UserProfileCard from './UserProfileCard.jsx';

function cardListValue(items) {
  return items.reduce((sum, item) => sum + getCardPrice(item.card), 0);
}

function MiniCardList({ items, sleeveId }) {
  if (!items.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CardSleeve sleeveId={sleeveId} size="small" />
        <Typography color="text.secondary">No cards</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      {items.map((item) => (
        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {!item.card && <CardSleeve sleeveId={sleeveId} size="small" />}
          <Typography noWrap variant="body2">
            {item.card?.name || 'Unavailable card'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function TradeSummaryCard({ currentUserId, onAccept, onCancel, onDecline, trade }) {
  const { getEquippedItem } = useCosmetics();
  const equippedSleeve = getEquippedItem('cardSleeve');
  const sleeveId = equippedSleeve?.id;
  const isIncoming = trade.receiver_id === currentUserId;
  const friend = isIncoming ? trade.sender : trade.receiver;
  const canAccept = isIncoming && trade.status === 'pending';
  const canCancel = !isIncoming && trade.status === 'pending';

  return (
    <Card className="tradeSummaryCard">
      <CardContent sx={{ display: 'grid', gap: 2 }}>
        <UserProfileCard
          profile={friend}
          actions={(
            <Chip
              color={trade.status === 'accepted' ? 'success' : trade.status === 'pending' ? 'warning' : 'default'}
              label={`${trade.status} - ${new Date(trade.created_at).toLocaleDateString()}`}
              sx={{ textTransform: 'capitalize', fontWeight: 900 }}
              variant="outlined"
            />
          )}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card className="tradeValueCard" variant="outlined">
            <CardContent>
              <Typography fontWeight={950} sx={{ color: 'var(--trade-accent, var(--text-accent))' }}>
                Offered - {formatPrice(cardListValue(trade.offeredItems))}
              </Typography>
              <MiniCardList items={trade.offeredItems} sleeveId={sleeveId} />
            </CardContent>
          </Card>
          <Card className="tradeValueCard" variant="outlined">
            <CardContent>
              <Typography fontWeight={950} sx={{ color: 'var(--trade-accent, var(--text-accent))' }}>
                Requested - {formatPrice(cardListValue(trade.requestedItems))}
              </Typography>
              <MiniCardList items={trade.requestedItems} sleeveId={sleeveId} />
            </CardContent>
          </Card>
        </Box>

        {trade.message && <Typography color="text.secondary">{trade.message}</Typography>}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button component={Link} to={`/trades/${trade.id}`} variant="outlined">
            View Details
          </Button>
          {canAccept && (
            <>
              <Button onClick={() => onAccept(trade)} variant="contained">Accept</Button>
              <Button onClick={() => onDecline(trade)} variant="outlined">Decline</Button>
            </>
          )}
          {canCancel && <Button color="error" onClick={() => onCancel(trade)} variant="outlined">Cancel</Button>}
        </Box>
      </CardContent>
    </Card>
  );
}
