// New trade flow picks exact card copies from each friend's collection.
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { Alert, Box, Button, Card, CardContent, Snackbar, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getFriends } from '../api/friends.js';
import { createTrade } from '../api/trades.js';
import { getMyCards, getUserCardsForUser } from '../api/userCards.js';
import PageHeader from '../components/PageHeader.jsx';
import TradeCardPicker, { TradeValueSummary } from '../components/TradeCardPicker.jsx';
import TradeSkinSurface from '../components/TradeSkinSurface.jsx';

export default function TradeNew() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [friendCards, setFriendCards] = useState([]);
  const [offeredCardIds, setOfferedCardIds] = useState([]);
  const [requestedCardIds, setRequestedCardIds] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const offeredCards = useMemo(
    () => myCards.filter((card) => offeredCardIds.includes(card.userCardId)),
    [myCards, offeredCardIds],
  );
  const requestedCards = useMemo(
    () => friendCards.filter((card) => requestedCardIds.includes(card.userCardId)),
    [friendCards, requestedCardIds],
  );

  useEffect(() => {
    async function loadTradeSetup() {
      try {
        setIsLoading(true);
        setError('');
        const friends = await getFriends();
        const friendship = friends.find((row) => row.friend_id === friendId);

        if (!friendship?.friend) {
          throw new Error('You can only trade with friends.');
        }

        const [mine, theirs] = await Promise.all([getMyCards(), getUserCardsForUser(friendId)]);

        setFriend(friendship.friend);
        setMyCards(mine);
        setFriendCards(theirs);
      } catch (loadError) {
        setError(loadError.message || 'This trade could not be prepared. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadTradeSetup();
  }, [friendId]);

  async function handleSendTrade() {
    if (isSending) return;

    try {
      setIsSending(true);
      const trade = await createTrade(friendId, offeredCardIds, requestedCardIds, message);
      setSnackbar({ message: 'Trade request sent.', severity: 'success' });
      navigate(`/trades/${trade.id}`);
    } catch (sendError) {
      setSnackbar({ message: sendError.message || 'Trade request could not be sent. Please try again.', severity: 'error' });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <TradeSkinSurface>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/friends" variant="outlined" sx={{ mb: 3 }}>
        Back to friends
      </Button>
      <PageHeader eyebrow="New trade" title={friend ? `Trade with ${friend.display_name}` : 'New trade'}>
        Choose cards to offer, request cards from your friend, then send a trade proposal.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info">Loading both collections...</Alert>}

      {!isLoading && !error && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            <TradeCardPicker
              cards={myCards}
              emptyText="Your cloud collection has no matching cards."
              selectedIds={offeredCardIds}
              setSelectedIds={setOfferedCardIds}
              title="Your collection"
            />
            <TradeCardPicker
              cards={friendCards}
              emptyText="Your friend's visible collection has no matching cards."
              selectedIds={requestedCardIds}
              setSelectedIds={setRequestedCardIds}
              title={`${friend?.display_name || 'Friend'}'s collection`}
            />
          </Box>

          <Card className="tradePreviewPanel" sx={{ borderColor: 'var(--trade-border)' }}>
            <CardContent sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="h5">Trade preview</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <TradeValueSummary cards={offeredCards} label="You give" />
                <TradeValueSummary cards={requestedCards} label="You receive" />
              </Box>
              <TextField
                fullWidth
                label="Message"
                multiline
                minRows={2}
                onChange={(event) => setMessage(event.target.value)}
                value={message}
              />
              <Button
                disabled={isSending || (!offeredCardIds.length && !requestedCardIds.length)}
                onClick={handleSendTrade}
                size="large"
                startIcon={<SendIcon />}
                variant="contained"
              >
                {isSending ? 'Sending request...' : 'Send trade request'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={3200}
        onClose={() => setSnackbar({ message: '', severity: 'success' })}
        open={Boolean(snackbar.message)}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </TradeSkinSurface>
  );
}
