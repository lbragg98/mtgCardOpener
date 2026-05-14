// PvP lobby lets friends send challenges or start AI matches using shared decks.
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ComputerIcon from '@mui/icons-material/Computer';
import GroupsIcon from '@mui/icons-material/Groups';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFriendBattleDecks, getMyBattleDecks } from '../api/battleDecks.js';
import { getFriends } from '../api/friends.js';
import {
  acceptBattleChallenge,
  cancelBattleChallenge,
  createAIFriendDeckMatch,
  declineBattleChallenge,
  getIncomingBattleChallenges,
  getMyActiveBattleMatches,
  getOutgoingBattleChallenges,
  sendBattleChallenge,
} from '../api/pvpBattle.js';
import PageHeader from '../components/PageHeader.jsx';
import { analyzeDeckColors, getDeckStrategy } from '../utils/deckBalance.js';

function getProfileName(profile) {
  return profile?.display_name || profile?.displayName || profile?.username || 'Friend';
}

function getFriendProfile(friendship) {
  return friendship?.friend || friendship?.profile || null;
}

function getDeckLabel(deck) {
  const count = Array.isArray(deck.cards) ? deck.cards.length : 0;
  return `${deck.name || 'Battle Deck'} (${count}/20, ${deck.visibility || 'private'})`;
}

function getDeckSelectValue(decks, selectedId) {
  if (selectedId && decks.some((deck) => deck.id === selectedId)) return selectedId;
  return decks[0]?.id || '';
}

function DeckPreview({ deck, title = 'Deck Preview' }) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  const colorAnalysis = analyzeDeckColors(cards);
  const strategy = getDeckStrategy(cards);
  const topColors = Object.entries(colorAnalysis.signatureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const creatureCount = cards.filter((card) => card.type === 'creature' || card.type === 'Creature').length;
  const averageCost = cards.length
    ? cards.reduce((total, card) => total + Number(card.cost || card.cmc || 1), 0) / cards.length
    : 0;

  if (!deck) return null;

  return (
    <Card variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.025)' }}>
      <CardContent sx={{ display: 'grid', gap: 1.25, p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" gap={1} sx={{ alignItems: 'start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">{title}</Typography>
            <Typography fontWeight={950} noWrap>{deck.name || 'Battle Deck'}</Typography>
          </Box>
          <Chip label={deck.visibility || 'shared'} size="small" variant="outlined" />
        </Stack>
        <Typography color="text.secondary" variant="body2">{strategy}</Typography>
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          <Chip label={`${cards.length}/20 cards`} size="small" />
          <Chip label={`${creatureCount} creatures`} size="small" variant="outlined" />
          <Chip label={`${averageCost.toFixed(1)} avg cost`} size="small" variant="outlined" />
          {topColors.map(([signature, count]) => (
            <Chip key={signature} label={`${signature}: ${count}`} size="small" variant="outlined" />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function EmptyAction({ children, to }) {
  return (
    <Alert
      action={to ? (
        <Button color="inherit" component={Link} size="small" to={to}>
          Build Deck
        </Button>
      ) : null}
      severity="info"
      variant="outlined"
    >
      {children}
    </Alert>
  );
}

export default function PvpBattleLobby() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState([]);
  const [activeMatches, setActiveMatches] = useState([]);
  const [tab, setTab] = useState('friends');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [liveDialog, setLiveDialog] = useState({ friend: null, message: '', myDeckId: '' });
  const [aiDialog, setAiDialog] = useState({
    aiDifficulty: 'normal',
    friend: null,
    friendDeckId: '',
    friendDecks: [],
    isLoadingDecks: false,
    myDeckId: '',
  });
  const [acceptDeckByChallenge, setAcceptDeckByChallenge] = useState({});

  const friendsById = useMemo(() => {
    const map = new Map();
    friends.forEach((friendship) => {
      const profile = getFriendProfile(friendship);
      if (profile?.id) map.set(profile.id, profile);
      if (friendship.friend_id) map.set(friendship.friend_id, profile);
    });
    return map;
  }, [friends]);
  const selectedFriendDeck = useMemo(
    () => aiDialog.friendDecks.find((deck) => deck.id === aiDialog.friendDeckId) || null,
    [aiDialog.friendDeckId, aiDialog.friendDecks],
  );

  async function refreshLobby() {
    try {
      setIsLoading(true);
      setError('');
      const [friendsResult, decksResult, incomingResult, outgoingResult, matchesResult] = await Promise.all([
        getFriends(),
        getMyBattleDecks(),
        getIncomingBattleChallenges(),
        getOutgoingBattleChallenges(),
        getMyActiveBattleMatches(),
      ]);

      setFriends(friendsResult);
      setMyDecks(decksResult);
      setIncomingChallenges(incomingResult);
      setOutgoingChallenges(outgoingResult);
      setActiveMatches(matchesResult);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load friend battles.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshLobby();
  }, []);

  function openLiveDialog(friendship) {
    setLiveDialog({
      friend: friendship,
      message: '',
      myDeckId: getDeckSelectValue(myDecks, ''),
    });
  }

  async function openAIDialog(friendship) {
    const profile = getFriendProfile(friendship);
    setAiDialog({
      aiDifficulty: 'normal',
      friend: friendship,
      friendDeckId: '',
      friendDecks: [],
      isLoadingDecks: true,
      myDeckId: getDeckSelectValue(myDecks, ''),
    });

    try {
      const friendDecks = await getFriendBattleDecks(profile.id || friendship.friend_id);
      setAiDialog((current) => ({
        ...current,
        friendDeckId: getDeckSelectValue(friendDecks, ''),
        friendDecks,
        isLoadingDecks: false,
      }));
    } catch (deckError) {
      setAiDialog((current) => ({ ...current, isLoadingDecks: false }));
      setSnackbar(deckError.message || 'Unable to load friend-visible decks.');
    }
  }

  async function handleSendLiveChallenge() {
    const profile = getFriendProfile(liveDialog.friend);
    if (!profile?.id || !liveDialog.myDeckId) return;

    try {
      setIsBusy(true);
      await sendBattleChallenge(profile.id, liveDialog.myDeckId, liveDialog.message);
      setLiveDialog({ friend: null, message: '', myDeckId: '' });
      setSnackbar('Battle challenge sent.');
      await refreshLobby();
    } catch (sendError) {
      setSnackbar(sendError.message || 'Unable to send battle challenge.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartAIBattle() {
    const profile = getFriendProfile(aiDialog.friend);
    if (!profile?.id || !aiDialog.myDeckId || !aiDialog.friendDeckId) return;

    try {
      setIsBusy(true);
      const match = await createAIFriendDeckMatch(profile.id, aiDialog.myDeckId, aiDialog.friendDeckId, aiDialog.aiDifficulty);
      setAiDialog({
        aiDifficulty: 'normal',
        friend: null,
        friendDeckId: '',
        friendDecks: [],
        isLoadingDecks: false,
        myDeckId: '',
      });
      navigate(`/battle/pvp/${match.id}`);
    } catch (aiError) {
      setSnackbar(aiError.message || 'Unable to start AI friend-deck battle.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAcceptChallenge(challenge) {
    const selectedDeckId = acceptDeckByChallenge[challenge.id] || myDecks[0]?.id;
    if (!selectedDeckId) {
      setSnackbar('Build a deck first.');
      return;
    }

    try {
      setIsBusy(true);
      const result = await acceptBattleChallenge(challenge.id, selectedDeckId);
      setSnackbar('Battle challenge accepted.');
      await refreshLobby();
      navigate(`/battle/pvp/${result.match.id}`);
    } catch (acceptError) {
      setSnackbar(acceptError.message || 'Unable to accept battle challenge.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeclineChallenge(challengeId) {
    try {
      setIsBusy(true);
      await declineBattleChallenge(challengeId);
      setSnackbar('Battle challenge declined.');
      await refreshLobby();
    } catch (declineError) {
      setSnackbar(declineError.message || 'Unable to decline challenge.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCancelChallenge(challengeId) {
    try {
      setIsBusy(true);
      await cancelBattleChallenge(challengeId);
      setSnackbar('Battle challenge cancelled.');
      await refreshLobby();
    } catch (cancelError) {
      setSnackbar(cancelError.message || 'Unable to cancel challenge.');
    } finally {
      setIsBusy(false);
    }
  }

  function renderDeckSelect(value, onChange, label = 'My Deck') {
    return (
      <FormControl fullWidth disabled={!myDecks.length}>
        <InputLabel>{label}</InputLabel>
        <Select label={label} onChange={(event) => onChange(event.target.value)} value={value || getDeckSelectValue(myDecks, value)}>
          {myDecks.map((deck) => (
            <MenuItem key={deck.id} value={deck.id}>
              {getDeckLabel(deck)}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{myDecks.length ? 'Choose one of your saved 20-card decks.' : 'Build a deck first.'}</FormHelperText>
      </FormControl>
    );
  }

  return (
    <Box>
      <Button component={Link} startIcon={<ArrowBackIcon />} to="/battle" variant="outlined" sx={{ mb: 3 }}>
        Back to Battle
      </Button>
      <PageHeader eyebrow="Binder Battle" title="Friend Battles">
        Challenge friends live or battle an AI using a friend-visible deck.
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {isLoading && <Alert severity="info" sx={{ mb: 3 }}>Loading friend battle lobby...</Alert>}
      {!isLoading && !myDecks.length && (
        <Box sx={{ mb: 3 }}>
          <EmptyAction to="/battle/deck-builder">Build a deck first before sending or accepting battle challenges.</EmptyAction>
        </Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            onChange={(_, nextTab) => setTab(nextTab)}
            value={tab}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          >
            <Tab icon={<GroupsIcon />} iconPosition="start" label="My Friends" value="friends" />
            <Tab icon={<SendIcon />} iconPosition="start" label={`Incoming (${incomingChallenges.length})`} value="incoming" />
            <Tab icon={<CancelIcon />} iconPosition="start" label={`Outgoing (${outgoingChallenges.length})`} value="outgoing" />
            <Tab icon={<SportsEsportsIcon />} iconPosition="start" label={`Active (${activeMatches.length})`} value="matches" />
          </Tabs>
        </CardContent>
      </Card>

      {tab === 'friends' && (
        <Grid container spacing={2}>
          {!friends.length && !isLoading && (
            <Grid size={{ xs: 12 }}>
              <EmptyAction>No friends yet. Add friends before starting friend battles.</EmptyAction>
            </Grid>
          )}
          {friends.map((friendship) => {
            const profile = getFriendProfile(friendship);
            return (
              <Grid key={friendship.id || friendship.friend_id} size={{ xs: 12, md: 6, xl: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'grid', gap: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={950} noWrap variant="h6">{getProfileName(profile)}</Typography>
                        <Typography color="text.secondary" noWrap variant="body2">
                          @{profile?.username || 'friend'}
                        </Typography>
                      </Box>
                      <Chip label="Friend" size="small" variant="outlined" />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                      <Button disabled={!myDecks.length || isBusy} onClick={() => openLiveDialog(friendship)} startIcon={<SendIcon />} variant="contained">
                        Challenge Live
                      </Button>
                      <Button disabled={!myDecks.length || isBusy} onClick={() => openAIDialog(friendship)} startIcon={<ComputerIcon />} variant="outlined">
                        Battle AI Deck
                      </Button>
                    </Stack>
                    <Chip color="info" label="Battle AI using friend's deck" size="small" variant="outlined" sx={{ justifySelf: 'start' }} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {tab === 'incoming' && (
        <Stack gap={2}>
          {!incomingChallenges.length && !isLoading && <EmptyAction>No incoming battle challenges.</EmptyAction>}
          {incomingChallenges.map((challenge) => {
            const challenger = friendsById.get(challenge.senderId || challenge.sender_id);
            const selectedDeckId = acceptDeckByChallenge[challenge.id] || getDeckSelectValue(myDecks, '');
            return (
              <Card key={challenge.id}>
                <CardContent sx={{ display: 'grid', gap: 1.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                    <Box>
                      <Typography fontWeight={950}>{getProfileName(challenger)}</Typography>
                      <Typography color="text.secondary" variant="body2">{challenge.message || 'No message.'}</Typography>
                    </Box>
                    <Chip label={challenge.mode === 'ai_friend_deck' ? 'AI Friend Deck' : 'Live PvP'} />
                  </Stack>
                  <Divider />
                  <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} sx={{ alignItems: { md: 'center' } }}>
                    {renderDeckSelect(selectedDeckId, (value) => setAcceptDeckByChallenge((current) => ({ ...current, [challenge.id]: value })), 'Deck to Use')}
                    <Button disabled={!myDecks.length || isBusy} onClick={() => handleAcceptChallenge(challenge)} startIcon={<CheckCircleIcon />} variant="contained">
                      Accept
                    </Button>
                    <Button disabled={isBusy} onClick={() => handleDeclineChallenge(challenge.id)} startIcon={<CancelIcon />} variant="outlined" color="error">
                      Decline
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {tab === 'outgoing' && (
        <Stack gap={2}>
          {!outgoingChallenges.length && !isLoading && <EmptyAction>No outgoing battle challenges.</EmptyAction>}
          {outgoingChallenges.map((challenge) => {
            const receiver = friendsById.get(challenge.receiverId || challenge.receiver_id);
            return (
              <Card key={challenge.id}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ alignItems: { sm: 'center' } }}>
                    <Box>
                      <Typography fontWeight={950}>{getProfileName(receiver)}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {challenge.status} - {challenge.mode === 'ai_friend_deck' ? 'AI friend-deck challenge' : 'Live PvP challenge'}
                      </Typography>
                    </Box>
                    <Button disabled={isBusy || challenge.status !== 'pending'} onClick={() => handleCancelChallenge(challenge.id)} startIcon={<CancelIcon />} variant="outlined" color="error">
                      Cancel
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {tab === 'matches' && (
        <Stack gap={2}>
          {!activeMatches.length && !isLoading && <EmptyAction>No active friend battle matches.</EmptyAction>}
          {activeMatches.map((match) => {
            const opponentId = friendsById.has(match.playerOneId) ? match.playerOneId : match.playerTwoId;
            const opponent = friendsById.get(opponentId);
            return (
              <Card key={match.id}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ alignItems: { sm: 'center' } }}>
                    <Box>
                      <Typography fontWeight={950}>{getProfileName(opponent)}</Typography>
                      <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                        <Chip color={match.mode === 'ai_friend_deck' ? 'info' : 'default'} label={match.mode === 'ai_friend_deck' ? "AI using friend's deck" : 'Live PvP'} size="small" />
                        <Chip label={match.currentTurnUserId === match.playerOneId ? 'Player One turn' : 'Player Two turn'} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                    <Button component={Link} startIcon={<PlayArrowIcon />} to={`/battle/pvp/${match.id}`} variant="contained">
                      Resume Match
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog fullWidth maxWidth="sm" onClose={() => setLiveDialog({ friend: null, message: '', myDeckId: '' })} open={Boolean(liveDialog.friend)}>
        <DialogTitle>Challenge {getProfileName(getFriendProfile(liveDialog.friend))}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {renderDeckSelect(liveDialog.myDeckId, (value) => setLiveDialog((current) => ({ ...current, myDeckId: value })))}
          <TextField
            label="Message"
            multiline
            minRows={3}
            onChange={(event) => setLiveDialog((current) => ({ ...current, message: event.target.value }))}
            placeholder="Optional challenge message"
            value={liveDialog.message}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiveDialog({ friend: null, message: '', myDeckId: '' })}>Cancel</Button>
          <Button disabled={!myDecks.length || !liveDialog.myDeckId || isBusy} onClick={handleSendLiveChallenge} startIcon={<SendIcon />} variant="contained">
            Send Challenge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setAiDialog((current) => ({ ...current, friend: null }))} open={Boolean(aiDialog.friend)}>
        <DialogTitle>
          <Stack direction="row" gap={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            Battle AI Deck: {getProfileName(getFriendProfile(aiDialog.friend))}
            <Chip color="info" label="Battle AI using friend's deck" size="small" />
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {renderDeckSelect(aiDialog.myDeckId, (value) => setAiDialog((current) => ({ ...current, myDeckId: value })))}
          <FormControl fullWidth disabled={aiDialog.isLoadingDecks || !aiDialog.friendDecks.length}>
            <InputLabel>Friend Deck</InputLabel>
            <Select
              label="Friend Deck"
              onChange={(event) => setAiDialog((current) => ({ ...current, friendDeckId: event.target.value }))}
              value={aiDialog.friendDeckId}
            >
              {aiDialog.friendDecks.map((deck) => (
                <MenuItem key={deck.id} value={deck.id}>
                  {getDeckLabel(deck)}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {aiDialog.isLoadingDecks
                ? 'Loading friend-visible decks...'
                : aiDialog.friendDecks.length
                  ? 'Choose a friend-visible deck for the AI to pilot.'
                  : 'This friend has no friend-visible decks.'}
            </FormHelperText>
          </FormControl>
          <Box>
            <Typography color="text.secondary" fontWeight={800} sx={{ mb: 1 }} variant="body2">AI Difficulty</Typography>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
              {['easy', 'normal', 'hard'].map((difficulty) => (
                <Chip
                  key={difficulty}
                  color={aiDialog.aiDifficulty === difficulty ? 'primary' : 'default'}
                  label={difficulty[0].toUpperCase() + difficulty.slice(1)}
                  onClick={() => setAiDialog((current) => ({ ...current, aiDifficulty: difficulty }))}
                  variant={aiDialog.aiDifficulty === difficulty ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
          <DeckPreview deck={selectedFriendDeck} title="Friend Deck Preview" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialog((current) => ({ ...current, friend: null }))}>Cancel</Button>
          <Button
            disabled={!myDecks.length || !aiDialog.friendDeckId || !aiDialog.myDeckId || aiDialog.isLoadingDecks || isBusy}
            onClick={handleStartAIBattle}
            startIcon={<PlayArrowIcon />}
            variant="contained"
          >
            Start Battle vs AI
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={3600} message={snackbar} onClose={() => setSnackbar('')} open={Boolean(snackbar)} />
    </Box>
  );
}
