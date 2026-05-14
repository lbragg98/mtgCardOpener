// Trades page lists active trade offers between accepted friends.
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { acceptTrade, cancelTrade, declineTrade, getMyTrades } from '../api/trades.js';
import PageHeader from '../components/PageHeader.jsx';
import TradeSkinSurface from '../components/TradeSkinSurface.jsx';
import TradeSummaryCard from '../components/TradeSummaryCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function EmptyState({ children }) {
  return (
    <Alert severity="info" variant="outlined">
      {children}
    </Alert>
  );
}

export default function Trades() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const [tradeToAccept, setTradeToAccept] = useState(null);

  async function loadTrades() {
    try {
      setIsLoading(true);
      setError('');
      setTrades(await getMyTrades());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load trades.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, [user?.id]);

  const groupedTrades = useMemo(
    () => ({
      incoming: trades.filter((trade) => trade.status === 'pending' && trade.receiver_id === user?.id),
      outgoing: trades.filter((trade) => trade.status === 'pending' && trade.sender_id === user?.id),
      history: trades.filter((trade) => trade.status !== 'pending'),
    }),
    [trades, user?.id],
  );
  const visibleTrades = [groupedTrades.incoming, groupedTrades.outgoing, groupedTrades.history][activeTab] || [];

  async function runTradeAction(action, message) {
    try {
      await action();
      await loadTrades();
      setSnackbar({ message, severity: 'success' });
    } catch (actionError) {
      setSnackbar({ message: actionError.message || 'Unable to update trade.', severity: 'error' });
    }
  }

  return (
    <TradeSkinSurface>
      <PageHeader eyebrow="Trading" title="Trades">
        Review incoming offers, manage outgoing trades, and keep a record of completed or cancelled deals.
      </PageHeader>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography color="text.secondary">Trade only with accepted friends.</Typography>
        <Button component={Link} startIcon={<AddIcon />} to="/friends" variant="contained">
          Start from Friends
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Tabs
        onChange={(_, nextTab) => setActiveTab(nextTab)}
        value={activeTab}
        sx={{ mb: 3, borderBottom: '1px solid rgba(248, 247, 255, 0.12)' }}
        variant="scrollable"
      >
        <Tab label={`Incoming (${groupedTrades.incoming.length})`} />
        <Tab label={`Outgoing (${groupedTrades.outgoing.length})`} />
        <Tab label={`History (${groupedTrades.history.length})`} />
      </Tabs>

      {isLoading ? (
        <Alert severity="info">Loading trades...</Alert>
      ) : visibleTrades.length === 0 ? (
        <EmptyState>No trades in this section.</EmptyState>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {visibleTrades.map((trade) => (
            <TradeSummaryCard
              key={trade.id}
              currentUserId={user.id}
              trade={trade}
              onAccept={(selectedTrade) => setTradeToAccept(selectedTrade)}
              onDecline={(selectedTrade) => runTradeAction(() => declineTrade(selectedTrade.id), 'Trade declined.')}
              onCancel={(selectedTrade) => runTradeAction(() => cancelTrade(selectedTrade.id), 'Trade cancelled.')}
            />
          ))}
        </Box>
      )}

      <Dialog onClose={() => setTradeToAccept(null)} open={Boolean(tradeToAccept)}>
        <DialogTitle>Accept trade?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will transfer ownership of the selected cards. If any card is no longer available, the trade will fail.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setTradeToAccept(null)} variant="outlined">Cancel</Button>
          <Button
            onClick={() => {
              const selectedTrade = tradeToAccept;
              setTradeToAccept(null);
              runTradeAction(() => acceptTrade(selectedTrade.id), 'Trade accepted.');
            }}
            variant="contained"
          >
            Accept Trade
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={3400}
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
