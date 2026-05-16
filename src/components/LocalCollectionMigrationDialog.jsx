import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { getMyCards, saveOpenedCards } from '../api/userCards.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCollection } from '../utils/collectionStorage.js';

const MIGRATION_COMPLETE_KEY = 'supabaseMigrationComplete';

function isSaveableMigrationCard(card) {
  const typeLine = card?.type_line?.toLowerCase() || '';

  return Boolean(
    card?.id &&
      card?.name &&
      card?.set &&
      (card?.image || card?.imageUrl) &&
      !typeLine.includes('token') &&
      !typeLine.includes('art series')
  );
}

function getMigrationCompleteKey(userId) {
  return `${MIGRATION_COMPLETE_KEY}:${userId}`;
}

function isMigrationComplete(userId) {
  try {
    return (
      localStorage.getItem(MIGRATION_COMPLETE_KEY) === 'true' ||
      localStorage.getItem(getMigrationCompleteKey(userId)) === 'true'
    );
  } catch {
    return true;
  }
}

function markMigrationComplete(userId) {
  localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
  localStorage.setItem(getMigrationCompleteKey(userId), 'true');
}

export default function LocalCollectionMigrationDialog() {
  const { user } = useAuth();
  const [localCards, setLocalCards] = useState([]);
  const [cloudCount, setCloudCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const hasCloudCards = cloudCount > 0;
  const saveableLocalCards = useMemo(
    () => localCards.filter(isSaveableMigrationCard),
    [localCards],
  );

  useEffect(() => {
    let isMounted = true;

    async function checkMigration() {
      if (!user || isMigrationComplete(user.id)) {
        setIsOpen(false);
        return;
      }

      const savedLocalCards = getCollection();

      const saveableCards = savedLocalCards.filter(isSaveableMigrationCard);

      if (!saveableCards.length) {
        markMigrationComplete(user.id);
        setIsOpen(false);
        return;
      }

      try {
        const cloudCards = await getMyCards();

        if (isMounted) {
          setCloudCount(cloudCards.length);
          setLocalCards(saveableCards);
          setIsOpen(true);
        }
      } catch {
        if (isMounted) {
          setCloudCount(0);
          setLocalCards(saveableCards);
          setIsOpen(true);
        }
      }
    }

    checkMigration();

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleImport() {
    if (!user || isImporting) {
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      await saveOpenedCards(saveableLocalCards, undefined, { skipDuplicateRewards: true });
      markMigrationComplete(user.id);
      window.dispatchEvent(new Event('collectionUpdated'));
      setIsOpen(false);
    } catch (importError) {
      setError(importError.message || 'Your local collection could not be imported. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleNotNow() {
    setIsOpen(false);
  }

  function handleDontAskAgain() {
    if (user) {
      markMigrationComplete(user.id);
    }

    setIsOpen(false);
  }

  return (
    <Dialog fullWidth maxWidth="xs" onClose={handleNotNow} open={isOpen}>
      <DialogTitle>Import local collection?</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <Typography color="text.secondary">
          We found {saveableLocalCards.length.toLocaleString()} local cards. Import them to your cloud account?
        </Typography>
        {hasCloudCards && (
          <Alert severity="warning" variant="outlined">
            Your cloud collection already has {cloudCount.toLocaleString()} cards. Importing may create duplicate copies.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1, p: 3, pt: 1 }}>
        <Button disabled={isImporting} onClick={handleImport} variant="contained">
          {isImporting ? 'Importing...' : 'Import'}
        </Button>
        <Button disabled={isImporting} onClick={handleNotNow} variant="outlined">
          Not now
        </Button>
        <Button disabled={isImporting} onClick={handleDontAskAgain} variant="outlined">
          Don't ask again
        </Button>
      </DialogActions>
    </Dialog>
  );
}
