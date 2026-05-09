import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { acceptTrade, cancelTrade, declineTrade, getTradeById } from '../api/trades.js';
import PageHeader from '../components/PageHeader.jsx';
import TradeSummaryCard from '../components/TradeSummaryCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function TradeDetail() {
  const { tradeId } = useParams();
  const { user } = useAuth();
  const [trade, setTrade] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });

  async function loadTrade() {
    try {
      setIsLoading(true);
      setError('');
      setTrade(await getTradeById(tradeId));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load trade.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTrade();
  }, [tradeId]);

  async function runAction(action, message) {
    try {
      await action();
      await loadTrade();
      setSnackbar({ message, severity: 'success' });
    } catch (actionError) {
      setSnackbar({ message: actionError.message || 'Unable to update trade.', severity: 'error' });
    }
  }

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/trades" variant="outlined" sx={{ mb: 3 }}>
        Back to Trades
      </Button>
      <PageHeader eyebrow="Trade Detail" title="Trade Offer">
        Review both sides before accepting. Cards move owners only when an incoming trade is accepted.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info">Loading trade...</Alert>}
      {!isLoading && trade && (
        <TradeSummaryCard
          currentUserId={user.id}
          trade={trade}
          onAccept={() => setConfirmAcceptOpen(true)}
          onDecline={(selectedTrade) => runAction(() => declineTrade(selectedTrade.id), 'Trade declined.')}
          onCancel={(selectedTrade) => runAction(() => cancelTrade(selectedTrade.id), 'Trade cancelled.')}
        />
      )}

      <Dialog onClose={() => setConfirmAcceptOpen(false)} open={confirmAcceptOpen}>
        <DialogTitle>Accept trade?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This will transfer ownership of the selected cards. If any card is no longer available, the trade will fail.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setConfirmAcceptOpen(false)} variant="outlined">Cancel</Button>
          <Button
            onClick={() => {
              setConfirmAcceptOpen(false);
              runAction(() => acceptTrade(trade.id), 'Trade accepted.');
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
    </Box>
  );
}
