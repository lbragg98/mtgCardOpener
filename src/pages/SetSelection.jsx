import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSets } from '../api/scryfall.js';
import PageHeader from '../components/PageHeader.jsx';

function formatReleaseDate(date) {
  if (!date) {
    return 'Release date unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function LoadingSetCards() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2.5,
        overflowX: 'auto',
        pb: 2,
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} sx={{ flex: '0 0 280px', maxWidth: '82vw' }}>
          <CardContent>
            <Skeleton variant="circular" width={56} height={56} sx={{ mb: 3 }} />
            <Skeleton variant="text" width="42%" />
            <Skeleton variant="text" width="88%" height={36} />
            <Skeleton variant="rounded" height={72} sx={{ my: 2 }} />
            <Skeleton variant="rounded" width={132} height={36} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default function SetSelection() {
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSets() {
      try {
        setIsLoading(true);
        setError('');
        const scryfallSets = await getSets();

        if (isMounted) {
          setSets(scryfallSets);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load Magic sets from Scryfall.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSets();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sets;
    }

    return sets.filter(
      (set) =>
        set.name.toLowerCase().includes(normalizedSearch) ||
        set.code.toLowerCase().includes(normalizedSearch),
    );
  }, [search, sets]);

  return (
    <Box>
      <PageHeader eyebrow="Open Packs" title="Select a set">
        Browse real expansion and core sets from Scryfall, then choose one to continue into the
        pack selection flow.
      </PageHeader>

      <TextField
        fullWidth
        label="Search sets"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by set name or code"
        value={search}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="secondary" />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 4,
          maxWidth: 520,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(16, 20, 38, 0.72)',
          },
        }}
      />

      {isLoading && <LoadingSetCards />}

      {!isLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && filteredSets.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No sets match that search.
        </Alert>
      )}

      {!isLoading && !error && filteredSets.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 2.5,
            mx: { xs: -2, sm: 0 },
            overflowX: 'auto',
            px: { xs: 2, sm: 0 },
            pb: 2.5,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              height: 10,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(143, 124, 255, 0.5)',
              borderRadius: 999,
            },
          }}
        >
          {filteredSets.map((set) => (
            <Card
              key={set.code}
              sx={{
                flex: { xs: '0 0 82vw', sm: '0 0 310px' },
                maxWidth: 340,
                minHeight: 320,
                scrollSnapAlign: 'start',
              }}
            >
              <CardActionArea
                component={Link}
                to={`/packs/${set.code}`}
                sx={{
                  display: 'flex',
                  height: '100%',
                  alignItems: 'stretch',
                }}
              >
                <CardContent sx={{ display: 'flex', width: '100%', flexDirection: 'column', p: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    width: 64,
                    height: 64,
                    mb: 3,
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: 'rgba(244, 201, 93, 0.1)',
                    border: '1px solid rgba(244, 201, 93, 0.32)',
                    boxShadow: '0 0 28px rgba(244, 201, 93, 0.16)',
                  }}
                >
                  {set.icon_svg_uri ? (
                    <Box
                      alt=""
                      component="img"
                      src={set.icon_svg_uri}
                      sx={{
                        width: 38,
                        height: 38,
                        filter: 'brightness(1.25) saturate(1.15)',
                      }}
                    />
                  ) : (
                    <Typography color="warning.main" fontWeight={900}>
                      {set.code.slice(0, 2).toUpperCase()}
                    </Typography>
                  )}
                </Box>
                <Typography color="warning.main" fontWeight={800} gutterBottom>
                  {set.code.toUpperCase()}
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {set.name}
                </Typography>
                <Box sx={{ display: 'grid', gap: 1.25, mt: 2, mb: 3, flexGrow: 1 }}>
                  <Typography color="text.secondary">Released: {formatReleaseDate(set.released_at)}</Typography>
                  <Typography color="text.secondary">Cards: {set.card_count.toLocaleString()}</Typography>
                  <Typography color="text.secondary">Type: {set.set_type}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 999,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontWeight: 800,
                  }}
                >
                  Choose Packs
                  <ArrowForwardIcon fontSize="small" />
                </Box>
              </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
