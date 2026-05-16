// Friends page handles search, requests, accepted friends, and jumping into trades/battles.
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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
  InputAdornment,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  removeFriend,
  searchProfilesByUsername,
  sendFriendRequest,
} from '../api/friends.js';
import PageHeader from '../components/PageHeader.jsx';
import UserProfileCard from '../components/UserProfileCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function EmptyState({ children }) {
  return (
    <Card sx={{ borderStyle: 'dashed' }}>
      <CardContent>
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          {children}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ message: '', severity: 'success' });
  const [friendToRemove, setFriendToRemove] = useState(null);

  const friendIds = useMemo(() => new Set(friends.map((friendship) => friendship.friend_id)), [friends]);
  const outgoingReceiverIds = useMemo(
    () => new Set(outgoingRequests.map((request) => request.receiver_id)),
    [outgoingRequests],
  );
  const incomingSenderIds = useMemo(
    () => new Set(incomingRequests.map((request) => request.sender_id)),
    [incomingRequests],
  );

  async function loadFriendData() {
    try {
      setIsLoading(true);
      setError('');
      const [incoming, outgoing, friendRows] = await Promise.all([
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
        getFriends(),
      ]);

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setFriends(friendRows);
    } catch (loadError) {
      setError(loadError.message || 'Your friends could not be loaded. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFriendData();
  }, [user?.id]);

  async function handleSearch(event) {
    event.preventDefault();

    try {
      setIsSearching(true);
      setError('');
      setSearchResults(await searchProfilesByUsername(query));
    } catch (searchError) {
      setError(searchError.message || 'Search could not be completed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }

  async function runAction(action, successMessage) {
    try {
      await action();
      await loadFriendData();
      setSnackbar({ message: successMessage, severity: 'success' });
    } catch (actionError) {
      setSnackbar({ message: actionError.message || 'That request could not be completed. Please try again.', severity: 'error' });
    }
  }

  function getSearchResultState(profileId) {
    if (friendIds.has(profileId)) return 'friends';
    if (outgoingReceiverIds.has(profileId) || incomingSenderIds.has(profileId)) return 'pending';
    return 'available';
  }

  return (
    <Box>
      <PageHeader eyebrow="Social" title="Friends">
        Find collectors, manage requests, and start trades with accepted friends.
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs
        onChange={(_, nextTab) => setActiveTab(nextTab)}
        value={activeTab}
        sx={{ mb: 3, borderBottom: '1px solid rgba(248, 247, 255, 0.12)' }}
        variant="scrollable"
      >
        <Tab label="Search users" />
        <Tab label={`Incoming (${incomingRequests.length})`} />
        <Tab label={`Outgoing (${outgoingRequests.length})`} />
        <Tab label={`My Friends (${friends.length})`} />
      </Tabs>

      {isLoading && <Alert severity="info">Loading your friends...</Alert>}

      {!isLoading && activeTab === 0 && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField
                  label="Search by username"
                  onChange={(event) => setQuery(event.target.value)}
                  value={query}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="secondary" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ flex: '1 1 260px' }}
                />
                <Button disabled={isSearching || query.trim().length < 2} type="submit" variant="contained">
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {searchResults.length === 0 ? (
            <EmptyState>Search for a username to find collectors.</EmptyState>
          ) : (
            searchResults.map((profile) => {
              const resultState = getSearchResultState(profile.id);

              return (
                <Card key={profile.id}>
                  <CardContent>
                    <UserProfileCard
                      profile={profile}
                      actions={(
                        <>
                          {resultState === 'friends' && <Chip color="success" label="Friends" />}
                          {resultState === 'pending' && <Chip color="warning" label="Pending" variant="outlined" />}
                          {resultState === 'available' && (
                            <Button
                              onClick={() =>
                                runAction(() => sendFriendRequest(profile.id), `Friend request sent to @${profile.username}.`)
                              }
                              startIcon={<PersonAddIcon />}
                              variant="contained"
                            >
                              Add friend
                            </Button>
                          )}
                        </>
                      )}
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      {!isLoading && activeTab === 1 && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {incomingRequests.length === 0 ? (
            <EmptyState>No incoming friend requests.</EmptyState>
          ) : (
            incomingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent>
                  <UserProfileCard
                    profile={request.sender}
                    actions={(
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Button onClick={() => runAction(() => acceptFriendRequest(request.id), 'Friend request accepted.')} variant="contained">
                          Accept
                        </Button>
                        <Button onClick={() => runAction(() => declineFriendRequest(request.id), 'Friend request declined.')} variant="outlined">
                          Decline
                        </Button>
                      </Box>
                    )}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      {!isLoading && activeTab === 2 && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {outgoingRequests.length === 0 ? (
            <EmptyState>No outgoing friend requests.</EmptyState>
          ) : (
            outgoingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent>
                  <UserProfileCard
                    profile={request.receiver}
                    actions={(
                      <Button onClick={() => runAction(() => cancelFriendRequest(request.id), 'Friend request cancelled.')} variant="outlined">
                        Cancel
                      </Button>
                    )}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      {!isLoading && activeTab === 3 && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {friends.length === 0 ? (
            <EmptyState>No friends yet. Search for a username to send a request.</EmptyState>
          ) : (
            friends.map((friendship) => (
              <Card key={friendship.id}>
                <CardContent>
                  <UserProfileCard
                    profile={friendship.friend}
                    actions={(
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Button
                          onClick={() => navigate(`/trades/new/${friendship.friend_id}`)}
                          startIcon={<SwapHorizIcon />}
                          variant="contained"
                        >
                          Trade
                        </Button>
                        <Button color="error" onClick={() => setFriendToRemove(friendship.friend)} variant="outlined">
                          Remove friend
                        </Button>
                      </Box>
                    )}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      <Dialog onClose={() => setFriendToRemove(null)} open={Boolean(friendToRemove)}>
        <DialogTitle>Remove friend?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Remove @{friendToRemove?.username} from your friends list? You can send another request later.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setFriendToRemove(null)} variant="outlined">
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              const profile = friendToRemove;
              setFriendToRemove(null);
              runAction(() => removeFriend(profile.id), 'Friend removed.');
            }}
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}
