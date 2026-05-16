import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Alert, Box, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addCardsToDisplayCase,
  getMyDisplayCases,
  removeCardFromDisplayCase,
} from '../api/displayCases.js';
import { getMyCards } from '../api/userCards.js';
import AddCardsToDisplayCaseDialog from '../components/AddCardsToDisplayCaseDialog.jsx';
import CardInspectionDialog from '../components/CardInspectionDialog.jsx';
import DisplayCase from '../components/DisplayCase.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Showcase() {
  const navigate = useNavigate();
  const [displayCases, setDisplayCases] = useState([]);
  const [collection, setCollection] = useState([]);
  const [caseToAddCards, setCaseToAddCards] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });

  async function loadShowcase() {
    try {
      setIsLoading(true);
      setError('');
      const [cases, cards] = await Promise.all([getMyDisplayCases(), getMyCards()]);
      setDisplayCases(cases);
      setCollection(cards);
    } catch (loadError) {
      setError(loadError.message || 'Your display cases could not be loaded. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadShowcase();

    window.addEventListener('displayCasesUpdated', loadShowcase);
    window.addEventListener('collectionUpdated', loadShowcase);

    return () => {
      window.removeEventListener('displayCasesUpdated', loadShowcase);
      window.removeEventListener('collectionUpdated', loadShowcase);
    };
  }, []);

  async function handleAddCards(userCardIds) {
    try {
      await addCardsToDisplayCase(caseToAddCards.displayCaseInstanceId, userCardIds);
      setCaseToAddCards(null);
      await loadShowcase();
      setSnackbar({ message: `Added ${userCardIds.length} card${userCardIds.length === 1 ? '' : 's'} to the display case.`, severity: 'success' });
    } catch (addError) {
      setSnackbar({ message: addError.message || 'Those cards could not be added. Please try again.', severity: 'error' });
    }
  }

  async function handleRemoveCard(displayCase, card) {
    try {
      await removeCardFromDisplayCase(displayCase.displayCaseInstanceId, card.userCardId || card.collectionId);
      await loadShowcase();
      setSnackbar({ message: 'Removed the card from the display case. It is still in your collection.', severity: 'success' });
    } catch (removeError) {
      setSnackbar({ message: removeError.message || 'That card could not be removed. Please try again.', severity: 'error' });
    }
  }

  return (
    <Box>
      <PageHeader eyebrow="Showcase" title="Display Cases">
        Place favorite cards from your cloud collection into display cases you own.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info">Loading your showcase...</Alert>}

      {!isLoading && displayCases.length === 0 && (
        <Card>
          <CardContent sx={{ display: 'grid', justifyItems: 'center', gap: 2, py: 7, textAlign: 'center' }}>
            <Inventory2Icon color="warning" sx={{ fontSize: 58 }} />
            <Typography variant="h4">No display cases yet</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
              Buy a display case in the Shop, then return here to add your favorite collection cards.
            </Typography>
            <Button onClick={() => navigate('/shop')} startIcon={<StorefrontIcon />} variant="contained">
              Go to shop
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && displayCases.length > 0 && (
        <Stack gap={3}>
          {displayCases.map((displayCase) => (
            <DisplayCase
              displayCase={displayCase}
              key={displayCase.displayCaseInstanceId}
              onAddCards={setCaseToAddCards}
              onInspectCard={setSelectedCard}
              onRemoveCard={handleRemoveCard}
            />
          ))}
        </Stack>
      )}

      <AddCardsToDisplayCaseDialog
        collection={collection}
        displayCase={caseToAddCards}
        onAddCards={handleAddCards}
        onClose={() => setCaseToAddCards(null)}
        open={Boolean(caseToAddCards)}
      />

      <CardInspectionDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        open={Boolean(selectedCard)}
        sourceContext="showcase"
      />

      <Snackbar autoHideDuration={3200} onClose={() => setSnackbar({ message: '', severity: 'success' })} open={Boolean(snackbar.message)}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
