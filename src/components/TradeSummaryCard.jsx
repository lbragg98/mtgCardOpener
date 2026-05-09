import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { formatPrice, getCardPrice } from '../utils/cardPricing.js';

function cardListValue(items) {
  return items.reduce((sum, item) => sum + getCardPrice(item.card), 0);
}

function MiniCardList({ items }) {
  if (!items.length) {
    return <Typography color="text.secondary">No cards</Typography>;
  }

  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      {items.map((item) => (
        <Typography key={item.id} noWrap variant="body2">
          {item.card?.name || 'Unavailable card'}
        </Typography>
      ))}
    </Box>
  );
}

export default function TradeSummaryCard({ currentUserId, onAccept, onCancel, onDecline, trade }) {
  const isIncoming = trade.receiver_id === currentUserId;
  const friend = isIncoming ? trade.sender : trade.receiver;
  const canAccept = isIncoming && trade.status === 'pending';
  const canCancel = !isIncoming && trade.status === 'pending';

  return (
    <Card>
      <CardContent sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>
              {friend?.display_name || 'Unknown collector'}
            </Typography>
            <Typography color="text.secondary" noWrap>
              @{friend?.username || 'unknown'} - {new Date(trade.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip
            color={trade.status === 'accepted' ? 'success' : trade.status === 'pending' ? 'warning' : 'default'}
            label={trade.status}
            sx={{ textTransform: 'capitalize', fontWeight: 900 }}
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="warning.main" fontWeight={950}>
                Offered - {formatPrice(cardListValue(trade.offeredItems))}
              </Typography>
              <MiniCardList items={trade.offeredItems} />
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography color="warning.main" fontWeight={950}>
                Requested - {formatPrice(cardListValue(trade.requestedItems))}
              </Typography>
              <MiniCardList items={trade.requestedItems} />
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
