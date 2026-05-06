import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Alert, Box, Button, Card, IconButton, Skeleton, Typography, useMediaQuery } from '@mui/material';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getArtCardsBySet, getCardsBySet } from '../api/scryfall.js';
import PageHeader from '../components/PageHeader.jsx';

const PACK_COUNT = 7;
const VISIBLE_SLOTS = [-3, -2, -1, 0, 1, 2, 3];
const DRAG_SENSITIVITY = 0.04;
const VELOCITY_PROJECTION = 0.01;
const MAX_FLICK_PACKS = 1;

function buildPackOptions(cards, artCards, setCode) {
  const showcasePool = cards.filter(
    (card) =>
      card.image &&
      !card.type_line?.toLowerCase().includes('land') &&
      ['mythic', 'rare'].includes(card.rarity),
  );
  const fallbackPool = cards.filter((card) => card.image);
  const artCardPool = artCards.filter((card) => card.image);
  const artworkPool = artCardPool.length > 0 ? artCardPool : showcasePool.length >= PACK_COUNT ? showcasePool : fallbackPool;

  return Array.from({ length: PACK_COUNT }, (_, index) => {
    const artworkCard = artworkPool[Math.floor((index * artworkPool.length) / PACK_COUNT)] || artworkPool[index];

    return {
      id: `${setCode}-play-booster-${index + 1}`,
      name: `Pack ${index + 1}`,
      setCode: setCode.toUpperCase(),
      artwork: artworkCard?.image,
      artworkCardName: artworkCard?.name || 'Mystery Card',
    };
  }).filter((pack) => Boolean(pack.artwork));
}

function PackSkeletons() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2.5,
        overflowX: 'auto',
        pb: 2,
      }}
    >
      {Array.from({ length: PACK_COUNT }).map((_, index) => (
        <Card key={index} sx={{ flex: '0 0 230px', height: 360, p: 2 }}>
          <Skeleton variant="rounded" height="100%" sx={{ borderRadius: 3 }} />
        </Card>
      ))}
    </Box>
  );
}

function MagicalParticles() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 22 }).map((_, index) => (
        <Box
          key={index}
          component={motion.div}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.75, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.4 + (index % 5) * 0.35, repeat: Infinity, delay: index * 0.13 }}
          sx={{
            position: 'absolute',
            top: `${12 + ((index * 37) % 74)}%`,
            left: `${4 + ((index * 53) % 92)}%`,
            width: index % 3 === 0 ? 4 : 3,
            height: index % 3 === 0 ? 4 : 3,
            borderRadius: '50%',
            bgcolor: index % 2 === 0 ? 'warning.main' : 'secondary.light',
            boxShadow: '0 0 14px currentColor',
            opacity: 0.35,
          }}
        />
      ))}
    </Box>
  );
}

function PackCard({ pack, isActive }) {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '30px 30px 18px 18px',
        background:
          'linear-gradient(180deg, rgba(248,247,255,0.2), rgba(22,18,39,0.92) 16%, rgba(5,7,17,0.96))',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 8,
          borderRadius: '24px 24px 13px 13px',
          border: '1px solid rgba(248, 247, 255, 0.22)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.08), transparent 12%, transparent 88%, rgba(255,255,255,0.08)), repeating-linear-gradient(98deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 16px), repeating-linear-gradient(174deg, rgba(244,201,93,0.035) 0 1px, transparent 1px 18px)',
          pointerEvents: 'none',
          zIndex: 5,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(118deg, transparent 0%, rgba(255,255,255,0.24) 25%, rgba(255,255,255,0.07) 35%, transparent 52%), linear-gradient(72deg, transparent 15%, rgba(76,201,240,0.12) 34%, rgba(244,201,93,0.16) 43%, transparent 58%), linear-gradient(90deg, rgba(255,255,255,0.13), transparent 18%, transparent 82%, rgba(255,255,255,0.1))',
          opacity: isActive ? 0.86 : 0.48,
          pointerEvents: 'none',
          zIndex: 4,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(248, 247, 255, 0.16)',
          background:
            'linear-gradient(180deg, rgba(5,7,17,0.96), rgba(24,18,43,0.9)), linear-gradient(90deg, rgba(244,201,93,0.18), transparent, rgba(76,201,240,0.12))',
          textShadow: '0 2px 12px rgba(0, 0, 0, 0.78)',
        }}
      >
        <Typography color="warning.main" fontWeight={900} sx={{ letterSpacing: 1.4 }}>
          {pack.setCode}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>
          SEALED BOOSTER
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          mx: 1.4,
          my: 1.1,
          overflow: 'hidden',
          borderRadius: 3.5,
          border: '1px solid rgba(248, 247, 255, 0.18)',
          backgroundImage: `linear-gradient(180deg, rgba(5,7,17,0.02), rgba(5,7,17,0.62)), url(${pack.artwork})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          boxShadow: 'inset 0 0 34px rgba(0,0,0,0.38)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.1), transparent 28%, transparent 72%, rgba(0,0,0,0.34)), linear-gradient(110deg, transparent 8%, rgba(255,255,255,0.18) 34%, transparent 48%)',
            pointerEvents: 'none',
          },
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          display: 'grid',
          justifyItems: 'center',
          gap: 0.25,
          px: 2,
          py: 1.35,
          borderTop: '1px solid rgba(248, 247, 255, 0.14)',
          background:
            'linear-gradient(180deg, rgba(28,19,46,0.88), rgba(5,7,17,0.96)), linear-gradient(90deg, rgba(76,201,240,0.12), transparent, rgba(244,201,93,0.16))',
          textShadow: '0 2px 12px rgba(0, 0, 0, 0.78)',
        }}
      >
        <Typography color="warning.main" sx={{ fontSize: { xs: 18, sm: 21 }, fontWeight: 950, letterSpacing: 2 }}>
          PLAY BOOSTER
        </Typography>
        <Typography color="text.secondary" noWrap sx={{ maxWidth: '100%', fontSize: 12 }}>
          {pack.artworkCardName}
        </Typography>
      </Box>
    </Box>
  );
}

function getShortestAngle(angle) {
  return ((angle + 180) % 360) - 180;
}

function getPackWheelStyleForAngle(angle, angleStep, radius) {
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians) * radius;
  const z = Math.cos(radians) * radius;
  const depth = (z + radius) / (radius * 2);
  const frontAngle = Math.abs(getShortestAngle(angle));
  const backFade = frontAngle > 145 ? 0.08 : frontAngle > 115 ? 0.22 : 1;

  return {
    x,
    z: z - radius,
    scale: 0.48 + depth * 0.52,
    opacity: Math.max(0.08, (0.16 + depth * 0.84) * backFade),
    rotateY: -getShortestAngle(angle),
    zIndex: Math.round(z + radius),
    isFront: frontAngle < angleStep / 2,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getWrappedIndex(index, length) {
  return ((index % length) + length) % length;
}

function WheelPackSlot({ activeIndex, angleStep, onCenterPack, onOpenPack, packOptions, radius, relativePosition, rotation }) {
  const packIndex = getWrappedIndex(activeIndex + relativePosition, packOptions.length);
  const pack = packOptions[packIndex];
  const isActive = relativePosition === 0;
  const baseAngle = relativePosition * angleStep;
  const x = useTransform(rotation, (value) => getPackWheelStyleForAngle(baseAngle + value, angleStep, radius).x);
  const y = useTransform(rotation, () => (isActive ? -10 : 0));
  const z = useTransform(rotation, (value) => getPackWheelStyleForAngle(baseAngle + value, angleStep, radius).z);
  const scale = useTransform(rotation, (value) => getPackWheelStyleForAngle(baseAngle + value, angleStep, radius).scale);
  const opacity = useTransform(rotation, (value) => getPackWheelStyleForAngle(baseAngle + value, angleStep, radius).opacity);
  const rotateY = useTransform(rotation, (value) => getPackWheelStyleForAngle(baseAngle + value, angleStep, radius).rotateY);
  const initialStyle = getPackWheelStyleForAngle(baseAngle, angleStep, radius);

  return (
    <Card
      component={motion.div}
      onClick={() => {
        if (isActive) {
          onOpenPack(pack);
        } else {
          onCenterPack(relativePosition);
        }
      }}
      sx={{
        position: 'absolute',
        left: '50%',
        top: { xs: 22, sm: 30 },
        ml: { xs: '-104px', sm: '-132px', md: '-146px' },
        width: { xs: 208, sm: 264, md: 292 },
        height: { xs: 340, sm: 430, md: 470 },
        overflow: 'hidden',
        color: 'text.primary',
        cursor: 'pointer',
        borderRadius: '28px 28px 18px 18px',
        borderColor: isActive ? 'rgba(244, 201, 93, 0.78)' : 'rgba(76, 201, 240, 0.24)',
        boxShadow: isActive
          ? '0 0 58px rgba(244, 201, 93, 0.38), 0 0 120px rgba(143, 124, 255, 0.18), 0 24px 70px rgba(0, 0, 0, 0.52)'
          : '0 18px 46px rgba(0, 0, 0, 0.36)',
        filter: isActive ? 'brightness(1.08)' : 'brightness(0.72) saturate(0.85)',
      }}
      style={{
        x,
        y,
        z,
        scale,
        opacity,
        rotateY,
        zIndex: initialStyle.zIndex,
        transformStyle: 'preserve-3d',
      }}
    >
      <PackCard pack={pack} isActive={isActive} />
    </Card>
  );
}

export default function PackSelection() {
  const { setCode } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const normalizedSetCode = setCode?.trim().toLowerCase() || '';
  const [cards, setCards] = useState([]);
  const [artCards, setArtCards] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const rotation = useMotionValue(0);
  const dragStartRotation = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCards() {
      try {
        setIsLoading(true);
        setError('');
        const [scryfallCards, scryfallArtCards] = await Promise.all([
          getCardsBySet(normalizedSetCode),
          getArtCardsBySet(normalizedSetCode),
        ]);

        if (isMounted) {
          setCards(scryfallCards);
          setArtCards(scryfallArtCards);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load cards for this set.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (normalizedSetCode) {
      loadCards();
    }

    return () => {
      isMounted = false;
    };
  }, [normalizedSetCode]);

  const setName = cards[0]?.set_name || normalizedSetCode.toUpperCase();
  const packOptions = useMemo(() => buildPackOptions(cards, artCards, normalizedSetCode), [
    artCards,
    cards,
    normalizedSetCode,
  ]);
  const activePack = packOptions[activeIndex] || packOptions[0];
  const angleStep = packOptions.length ? 360 / packOptions.length : 0;
  const wheelRadius = isMobile ? 220 : 360;

  useEffect(() => {
    setActiveIndex(0);
    rotation.set(0);
  }, [normalizedSetCode, rotation]);

  function snapToOffset(targetOffset, indexDelta) {
    animate(rotation, targetOffset, {
      type: 'spring',
      stiffness: 70,
      damping: 38,
      mass: 1.4,
      restDelta: 0.01,
      restSpeed: 0.01,
    }).then(() => {
      setActiveIndex((index) => getWrappedIndex(index + indexDelta, packOptions.length));
      rotation.set(0);
    });
  }

  const goNext = useCallback(() => {
    if (!packOptions.length) {
      return;
    }

    snapToOffset(-angleStep, 1);
  }, [angleStep, packOptions.length]);

  const goPrev = useCallback(() => {
    if (!packOptions.length) {
      return;
    }

    snapToOffset(angleStep, -1);
  }, [angleStep, packOptions.length]);

  function openPack(pack = activePack) {
    if (!pack) {
      return;
    }

    navigate(`/open/${normalizedSetCode}`, {
      state: {
        packArtwork: pack.artwork,
        packArtworkCardName: pack.artworkCardName,
        packName: pack.name,
      },
    });
  }

  function handleDragEnd(_, info) {
    if (!packOptions.length) {
      return;
    }

    let snappedOffset;

    if (Math.abs(info.velocity.x) > 700) {
      const projectedRotation = rotation.get() + info.velocity.x * VELOCITY_PROJECTION;
      const maxRotationDelta = MAX_FLICK_PACKS * angleStep;
      const clampedRotation = clamp(
        projectedRotation,
        dragStartRotation.current - maxRotationDelta,
        dragStartRotation.current + maxRotationDelta,
      );

      snappedOffset = Math.round(clampedRotation / angleStep) * angleStep;
    } else if (info.offset.x < -80) {
      snappedOffset = -angleStep;
    } else if (info.offset.x > 80) {
      snappedOffset = angleStep;
    } else {
      snappedOffset = 0;
    }

    const indexDelta = Math.round(-snappedOffset / angleStep);
    snapToOffset(snappedOffset, indexDelta);
  }

  function centerPack(relativePosition) {
    if (!packOptions.length) {
      return;
    }

    snapToOffset(-relativePosition * angleStep, relativePosition);
  }

  function handleDrag(_, info) {
    rotation.set(dragStartRotation.current + info.offset.x * DRAG_SENSITIVITY);
  }

  function handleDragStart() {
    dragStartRotation.current = rotation.get();
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 96px)' }}>
      <PageHeader eyebrow={normalizedSetCode.toUpperCase()} title="Choose your pack">
        Pick a simulated Play Booster for {setName}. Pack wrappers prefer Scryfall art cards from
        this set and open into a generated reveal.
      </PageHeader>

      <Button component={Link} startIcon={<ArrowBackIcon />} to="/sets" variant="outlined" sx={{ mb: 4 }}>
        Change Set
      </Button>

      {isLoading && <PackSkeletons />}

      {!isLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && packOptions.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No usable card artwork was found for this set.
        </Alert>
      )}

      {!isLoading && !error && packOptions.length > 0 && (
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            justifyItems: 'center',
            gap: 2.5,
            mx: { xs: -2, md: -4 },
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
            overflow: 'hidden',
            borderRadius: { xs: 0, md: 4 },
            background:
              'radial-gradient(circle at 50% 42%, rgba(244,201,93,0.16), transparent 28rem), radial-gradient(circle at 50% 64%, rgba(76,201,240,0.1), transparent 32rem), rgba(3,5,13,0.72)',
          }}
        >
          <MagicalParticles />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h2" sx={{ fontSize: { xs: 30, md: 38 }, mb: 0.5 }}>
              Choose Your Pack
            </Typography>
            <Typography color="text.secondary">Sealed boosters circle through the dark.</Typography>
          </Box>

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 1040,
              height: { xs: 430, sm: 520, md: 560 },
              overflow: 'hidden',
              touchAction: 'pan-y',
              perspective: '1200px',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: '45%',
                width: { xs: 320, sm: 430 },
                height: { xs: 320, sm: 430 },
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(244, 201, 93, 0.22), rgba(143, 124, 255, 0.14) 42%, transparent 68%)',
                filter: 'blur(8px)',
                pointerEvents: 'none',
              },
            }}
          >
            <IconButton
              aria-label="Previous pack"
              onClick={goPrev}
              sx={{
                position: 'absolute',
                top: '50%',
                left: { xs: 2, md: 18 },
                zIndex: 5,
                bgcolor: 'rgba(5, 7, 17, 0.72)',
                border: '1px solid rgba(248, 247, 255, 0.16)',
                '&:hover': { bgcolor: 'rgba(16, 20, 38, 0.92)' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <IconButton
              aria-label="Next pack"
              onClick={goNext}
              sx={{
                position: 'absolute',
                top: '50%',
                right: { xs: 2, md: 18 },
                zIndex: 5,
                bgcolor: 'rgba(5, 7, 17, 0.72)',
                border: '1px solid rgba(248, 247, 255, 0.16)',
                '&:hover': { bgcolor: 'rgba(16, 20, 38, 0.92)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            >
              {VISIBLE_SLOTS.map((relativePosition) => (
                <WheelPackSlot
                  key={`slot-${relativePosition}`}
                  activeIndex={activeIndex}
                  angleStep={angleStep}
                  onCenterPack={centerPack}
                  onOpenPack={openPack}
                  packOptions={packOptions}
                  radius={wheelRadius}
                  relativePosition={relativePosition}
                  rotation={rotation}
                />
              ))}
            </Box>

            <Box
              component={motion.div}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              style={{ x: 0 }}
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                cursor: 'grab',
                bgcolor: 'transparent',
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
            />
          </Box>

          <Typography color="text.secondary" fontWeight={700}>
            Swipe to browse packs
          </Typography>

          <Button
            disabled={!activePack}
            onClick={() => openPack()}
            size="large"
            startIcon={<AutoAwesomeIcon />}
            variant="contained"
          >
            Open This Pack
          </Button>
        </Box>
      )}
    </Box>
  );
}
