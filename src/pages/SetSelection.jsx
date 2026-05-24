// Set selection shows Scryfall sets while marking app-level collector-only locks.
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSets } from '../api/scryfall.js';
import { getPackShards } from '../utils/collectionStorage.js';
import { getCollectorOnlySetReason, isCollectorOnlySet } from '../utils/collectorOnlySets.js';

const COLLECTOR_BOOSTER_COST = 1000;

const VISIBLE_SET_SLOTS = [-2, -1, 0, 1, 2];
const DESKTOP_SLOT_STYLES = {
  '-2': { x: -430, scale: 0.55, rotateY: 45, opacity: 0.25, zIndex: 3 },
  '-1': { x: -260, scale: 0.78, rotateY: 30, opacity: 0.6, zIndex: 6 },
  0: { x: 0, scale: 1, rotateY: 0, opacity: 1, zIndex: 10 },
  1: { x: 260, scale: 0.78, rotateY: -30, opacity: 0.6, zIndex: 6 },
  2: { x: 430, scale: 0.55, rotateY: -45, opacity: 0.25, zIndex: 3 },
};
const MOBILE_SLOT_STYLES = {
  '-2': { x: -245, scale: 0.55, rotateY: 45, opacity: 0.25, zIndex: 3 },
  '-1': { x: -145, scale: 0.78, rotateY: 30, opacity: 0.6, zIndex: 6 },
  0: { x: 0, scale: 1, rotateY: 0, opacity: 1, zIndex: 10 },
  1: { x: 145, scale: 0.78, rotateY: -30, opacity: 0.6, zIndex: 6 },
  2: { x: 245, scale: 0.55, rotateY: -45, opacity: 0.25, zIndex: 3 },
};
const SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 120,
  damping: 22,
  mass: 0.9,
};

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

function getWrappedIndex(index, length) {
  return ((index % length) + length) % length;
}

function LoadingSetCards() {
  return (
    <Box sx={{ display: 'grid', minHeight: 420, placeItems: 'center' }}>
      <Card sx={{ width: { xs: '86vw', sm: 380 }, maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="circular" width={82} height={82} sx={{ mb: 3, mx: 'auto' }} />
          <Skeleton variant="text" width="42%" sx={{ mx: 'auto' }} />
          <Skeleton variant="text" width="88%" height={46} sx={{ mx: 'auto' }} />
          <Skeleton variant="rounded" height={116} sx={{ my: 2 }} />
          <Skeleton variant="rounded" width={156} height={42} sx={{ mx: 'auto' }} />
        </CardContent>
      </Card>
    </Box>
  );
}

function MagicalParticles() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 24 }).map((_, index) => (
        <Box
          key={index}
          component={motion.div}
          animate={{ y: [0, -16, 0], opacity: [0.18, 0.7, 0.18], scale: [0.8, 1.18, 0.8] }}
          transition={{ duration: 2.6 + (index % 4) * 0.4, repeat: Infinity, delay: index * 0.11 }}
          sx={{
            position: 'absolute',
            top: `${8 + ((index * 41) % 82)}%`,
            left: `${3 + ((index * 47) % 94)}%`,
            width: index % 4 === 0 ? 4 : 3,
            height: index % 4 === 0 ? 4 : 3,
            borderRadius: '50%',
            bgcolor: index % 2 === 0 ? 'warning.main' : 'secondary.light',
            boxShadow: '0 0 14px currentColor',
          }}
        />
      ))}
    </Box>
  );
}

function SetIcon({ set, size = 54 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        width: size,
        height: size,
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'rgba(244, 201, 93, 0.1)',
        border: '1px solid rgba(244, 201, 93, 0.36)',
        boxShadow: '0 0 30px rgba(244, 201, 93, 0.18)',
      }}
    >
      {set.icon_svg_uri ? (
        <Box
          alt=""
          component="img"
          src={set.icon_svg_uri}
          sx={{ width: size * 0.58, height: size * 0.58, filter: 'brightness(1.35) saturate(1.2)' }}
        />
      ) : (
        <Typography color="warning.main" fontWeight={900}>
          {set.code.slice(0, 2).toUpperCase()}
        </Typography>
      )}
    </Box>
  );
}

function SetCarouselCard({ isMobile, onChoose, onFocus, relativePosition, set }) {
  const isActive = relativePosition === 0;
  const slotStyle = isMobile ? MOBILE_SLOT_STYLES[relativePosition] : DESKTOP_SLOT_STYLES[relativePosition];
  const isCollectorOnly = isCollectorOnlySet(set);

  return (
    <Card
      component={motion.div}
      animate={{
        x: slotStyle.x,
        y: isActive ? [-8, -16, -8] : 0,
        scale: slotStyle.scale,
        opacity: slotStyle.opacity,
        rotateY: slotStyle.rotateY,
      }}
      initial={false}
      onClick={() => {
        if (isActive) {
          onChoose();
          return;
        }

        onFocus(relativePosition);
      }}
      style={{ zIndex: slotStyle.zIndex, transformStyle: 'preserve-3d' }}
      transition={
        isActive
          ? {
              x: SPRING_TRANSITION,
              scale: SPRING_TRANSITION,
              opacity: { duration: 0.18 },
              rotateY: SPRING_TRANSITION,
              y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
            }
          : SPRING_TRANSITION
      }
      sx={{
        position: 'absolute',
        left: '50%',
        top: { xs: 24, sm: 34 },
        ml: { xs: '-142px', sm: '-190px' },
        width: { xs: 284, sm: 380 },
        minHeight: { xs: 330, sm: 390 },
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 4,
        borderColor: isCollectorOnly
          ? 'rgba(244, 201, 93, 0.86)'
          : isActive
            ? 'rgba(244, 201, 93, 0.76)'
            : 'rgba(76, 201, 240, 0.22)',
        boxShadow: isActive
          ? isCollectorOnly
            ? '0 0 62px rgba(244, 201, 93, 0.38), 0 0 130px rgba(76, 201, 240, 0.16), 0 24px 70px rgba(0, 0, 0, 0.5)'
            : '0 0 58px rgba(244, 201, 93, 0.32), 0 0 120px rgba(143, 124, 255, 0.16), 0 24px 70px rgba(0, 0, 0, 0.5)'
          : '0 18px 46px rgba(0, 0, 0, 0.36)',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(118deg, transparent 0%, rgba(255,255,255,0.2) 28%, rgba(255,255,255,0.05) 40%, transparent 58%)',
          opacity: isActive ? 0.78 : 0.22,
          pointerEvents: 'none',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, display: 'grid', minHeight: 'inherit', p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'grid', justifyItems: 'center', textAlign: 'center' }}>
          <SetIcon set={set} size={isActive ? 88 : 72} />
          <Typography color="warning.main" fontWeight={900} sx={{ mt: 2, letterSpacing: 1.5 }}>
            {set.code.toUpperCase()}
          </Typography>
          <Typography variant={isActive ? 'h4' : 'h5'} sx={{ mt: 0.5, lineHeight: 1.08 }}>
            {set.name}
          </Typography>
          {isCollectorOnly && (
            <Chip
              color="warning"
              icon={<LockIcon />}
              label="Collector Only"
              size="small"
              sx={{ mt: 1.5, fontWeight: 900 }}
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 1.2, mt: 3, alignSelf: 'end' }}>
          <Typography color="text.secondary">Released: {formatReleaseDate(set.released_at)}</Typography>
          <Typography color="text.secondary">Cards: {set.card_count.toLocaleString()}</Typography>
          <Typography color="text.secondary">Type: {set.set_type}</Typography>
          {isCollectorOnly && (
            <Typography color="warning.main" fontWeight={800}>
              Collector Booster required
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SetSelection() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const dragMovedRef = useRef(false);
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [packShards, setPackShards] = useState(() => getPackShards());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    function refreshPackShards() {
      setPackShards(getPackShards());
    }

    window.addEventListener('packShardsUpdated', refreshPackShards);
    window.addEventListener('storage', refreshPackShards);

    return () => {
      window.removeEventListener('packShardsUpdated', refreshPackShards);
      window.removeEventListener('storage', refreshPackShards);
    };
  }, []);

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
          setError(loadError.message || 'Magic sets could not be loaded from Scryfall.');
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

  const activeSet = filteredSets.length ? filteredSets[getWrappedIndex(activeIndex, filteredSets.length)] : null;

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  const goNext = useCallback(() => {
    if (filteredSets.length <= 1) {
      return;
    }

    setActiveIndex((index) => index + 1);
  }, [filteredSets.length]);

  const goPrev = useCallback(() => {
    if (filteredSets.length <= 1) {
      return;
    }

    setActiveIndex((index) => index - 1);
  }, [filteredSets.length]);

  function focusRelativeSet(relativePosition) {
    if (filteredSets.length <= 1) {
      return;
    }

    setActiveIndex((index) => index + relativePosition);
  }

  function chooseSet() {
    if (activeSet?.code) {
      navigate(`/packs/${activeSet.code}`, {
        state: isCollectorOnlySet(activeSet) ? { preferredBoosterType: 'collector' } : undefined,
      });
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 'calc(100vh - 96px)',
        mx: { xs: -2, md: -4 },
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
        overflow: 'hidden',
        borderRadius: { xs: 0, md: 4 },
        background:
          'radial-gradient(circle at 50% 38%, rgba(244,201,93,0.16), transparent 28rem), radial-gradient(circle at 50% 62%, rgba(76,201,240,0.1), transparent 34rem), rgba(3,5,13,0.78)',
      }}
    >
      <MagicalParticles />

      <Box sx={{ position: 'relative', zIndex: 1, mx: 'auto', maxWidth: 980, textAlign: 'center' }}>
        <Typography color="warning.main" fontWeight={900} sx={{ mb: 1 }}>
          Open Packs
        </Typography>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: 38, md: 58 }, mb: 1 }}>
          Choose a set
        </Typography>
        <Typography color="text.secondary" sx={{ mx: 'auto', maxWidth: 700, fontSize: 18, lineHeight: 1.65 }}>
          Pick a Magic set from Scryfall, then choose how you want to open it.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            mx: 'auto',
            mt: 3,
            maxWidth: 620,
            p: 1.5,
            border: '1px solid rgba(248, 247, 255, 0.12)',
            borderRadius: 3,
            bgcolor: 'rgba(16, 20, 38, 0.58)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <TextField
            fullWidth
            label="Search sets"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by set name or code"
            value={search}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="secondary" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5, 7, 17, 0.54)' } }}
          />
          {!isLoading && !error && (
            <Typography color="text.secondary" sx={{ textAlign: 'left', px: 1 }}>
              {filteredSets.length} {filteredSets.length === 1 ? 'set' : 'sets'} found
            </Typography>
          )}
        </Box>
      </Box>

      {isLoading && <LoadingSetCards />}

      {!isLoading && error && (
        <Alert severity="error" sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
          {error} Try refreshing the page or searching again in a moment.
        </Alert>
      )}

      {!isLoading && !error && filteredSets.length === 0 && (
        <Card sx={{ position: 'relative', zIndex: 1, mx: 'auto', mt: 5, maxWidth: 560, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              No sets found
            </Typography>
            <Typography color="text.secondary">
              Try a set name like Dominaria or a short code like DMU.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredSets.length > 0 && (
        <Box sx={{ position: 'relative', zIndex: 1, display: 'grid', justifyItems: 'center', gap: 2.5, mt: 4 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 1060,
              height: { xs: 390, sm: 500 },
              overflow: 'hidden',
              perspective: '1200px',
              touchAction: 'pan-y',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: '48%',
                width: { xs: 320, sm: 460 },
                height: { xs: 320, sm: 460 },
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(244, 201, 93, 0.24), rgba(143, 124, 255, 0.15) 42%, transparent 68%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
              },
            }}
          >
            <IconButton
              aria-label="Previous set"
              disabled={filteredSets.length <= 1}
              onClick={goPrev}
              sx={{
                position: 'absolute',
                top: '50%',
                left: { xs: 2, md: 18 },
                zIndex: 20,
                bgcolor: 'rgba(5, 7, 17, 0.72)',
                border: '1px solid rgba(248, 247, 255, 0.16)',
                '&:hover': { bgcolor: 'rgba(16, 20, 38, 0.92)' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <IconButton
              aria-label="Next set"
              disabled={filteredSets.length <= 1}
              onClick={goNext}
              sx={{
                position: 'absolute',
                top: '50%',
                right: { xs: 2, md: 18 },
                zIndex: 20,
                bgcolor: 'rgba(5, 7, 17, 0.72)',
                border: '1px solid rgba(248, 247, 255, 0.16)',
                '&:hover': { bgcolor: 'rgba(16, 20, 38, 0.92)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>

            <Box sx={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
              {VISIBLE_SET_SLOTS.map((relativePosition) => {
                const setIndex = getWrappedIndex(activeIndex + relativePosition, filteredSets.length);
                const set = filteredSets[setIndex];

                return (
                  <SetCarouselCard
                    key={`set-slot-${relativePosition}`}
                    isMobile={isMobile}
                    onChoose={chooseSet}
                    onFocus={focusRelativeSet}
                    relativePosition={relativePosition}
                    set={set}
                  />
                );
              })}
            </Box>

            <Box
              component={motion.div}
              drag={filteredSets.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0}
              onClick={() => {
                if (!dragMovedRef.current) {
                  chooseSet();
                }
              }}
              onDrag={(_, info) => {
                if (Math.abs(info.offset.x) > 8) {
                  dragMovedRef.current = true;
                }
              }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) {
                  goNext();
                } else if (info.offset.x > 60) {
                  goPrev();
                }

                window.setTimeout(() => {
                  dragMovedRef.current = false;
                }, 180);
              }}
              style={{ x: 0 }}
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 18,
                cursor: filteredSets.length > 1 ? 'grab' : 'pointer',
                bgcolor: 'transparent',
                '&:active': {
                  cursor: filteredSets.length > 1 ? 'grabbing' : 'pointer',
                },
              }}
            />
          </Box>

          {activeSet && (
            <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Selected set: {activeSet.name} ({activeSet.code.toUpperCase()})
              </Typography>
              {isCollectorOnlySet(activeSet) && (
                <Alert severity="warning" sx={{ maxWidth: 560, textAlign: 'left' }} variant="outlined">
                  {getCollectorOnlySetReason(activeSet)}{' '}
                  {packShards >= COLLECTOR_BOOSTER_COST
                    ? 'Collector Booster is available.'
                    : `Need ${(COLLECTOR_BOOSTER_COST - packShards).toLocaleString()} more Pack Shards.`}
                </Alert>
              )}
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={chooseSet}
                size="large"
                startIcon={isCollectorOnlySet(activeSet) ? <LockIcon /> : undefined}
                variant="contained"
              >
                {isCollectorOnlySet(activeSet) ? 'Continue to Collector Booster' : 'Continue'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
