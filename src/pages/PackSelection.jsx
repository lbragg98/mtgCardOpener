// Pack selection chooses wrapper art and enforces Play vs Collector Booster access.
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
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
  IconButton,
  Skeleton,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getArtCardsBySet, getCardsBySet, getSets } from '../api/scryfall.js';
import PageHeader from '../components/PageHeader.jsx';
import PackCard from '../components/PackCard.jsx';
import { getPackShards } from '../utils/collectionStorage.js';
import { getCollectorOnlySetReason, isCollectorOnlySet } from '../utils/collectorOnlySets.js';
import { getPackArtForSet } from '../utils/packArt.js';

const PACK_COUNT = 7;
const COLLECTOR_BOOSTER_COST = 1000;
const PACK_QUANTITY_OPTIONS = [1, 10];
const DESKTOP_DRAG_SENSITIVITY = 0.045;
const MOBILE_DRAG_SENSITIVITY = 0.075;
const DESKTOP_VELOCITY_PROJECTION = 0.018;
const MOBILE_VELOCITY_PROJECTION = 0.025;
const DESKTOP_MAX_PACKS_PER_FLICK = 2;
const MOBILE_MAX_PACKS_PER_FLICK = 2;
const DESKTOP_SPRING_CONFIG = {
  type: 'spring',
  stiffness: 85,
  damping: 32,
  mass: 1.25,
  restDelta: 0.01,
  restSpeed: 0.01,
};
const MOBILE_SPRING_CONFIG = {
  type: 'spring',
  stiffness: 95,
  damping: 28,
  mass: 1,
  restDelta: 0.01,
  restSpeed: 0.01,
};

function buildPackOptions(cards, artCards, setCode) {
  const realPackArt = getPackArtForSet(setCode);
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
      setName: artworkCard?.set_name,
      realPackArt,
      accentArtwork: artworkCard?.image,
      artwork: realPackArt || artworkCard?.image,
      boosterLabel: 'PLAY BOOSTER',
      artworkCardName: artworkCard?.name || 'Mystery Card',
    };
  });
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

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function wrapIndex(index, length) {
  return length ? ((index % length) + length) % length : 0;
}

function getCenteredIndexFromRotation(rotationValue, itemCount) {
  const angleStep = 360 / itemCount;
  const rawIndex = Math.round(-rotationValue / angleStep);
  return wrapIndex(rawIndex, itemCount);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getShortestAngle(angle) {
  const normalizedAngle = normalizeAngle(angle);
  return normalizedAngle > 180 ? normalizedAngle - 360 : normalizedAngle;
}

function getPackWheelStyle(index, rotationValue, packCount, radius, isMobile = false) {
  const angleStep = 360 / packCount;
  const angle = index * angleStep + rotationValue;
  const normalizedAngle = normalizeAngle(angle);
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians) * radius;
  const z = Math.cos(radians) * radius;
  const depth = (z + radius) / (radius * 2);
  const shortestAngle = getShortestAngle(normalizedAngle);
  const frontAngle = Math.abs(shortestAngle);
  const visibleRange = isMobile ? 2 : 3;
  const isVisible = frontAngle <= angleStep * visibleRange;
  const backFade = frontAngle > 155 ? 0.34 : frontAngle > 115 ? 0.52 : 1;
  const minVisibleOpacity = isMobile ? 0.16 : 0.06;
  const rotateIntensity = isMobile ? 0.64 : 1;

  return {
    x,
    z: z - radius,
    scale: isMobile ? 0.62 + depth * 0.38 : 0.48 + depth * 0.52,
    opacity: isVisible ? Math.max(minVisibleOpacity, (0.2 + depth * 0.8) * backFade) : 0,
    rotateY: -shortestAngle * rotateIntensity,
    zIndex: Math.round(z + radius),
    frontCloseness: Math.max(0, 1 - frontAngle / angleStep),
  };
}

function WheelPack({ index, isActive, isDragging, isMobile, onCenterPack, pack, packCount, radius, rotation, setInfo }) {
  const x = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).x);
  const y = useTransform(rotation, (value) =>
    (isMobile ? -5 : -10) * getPackWheelStyle(index, value, packCount, radius, isMobile).frontCloseness,
  );
  const z = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).z);
  const scale = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).scale);
  const opacity = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).opacity);
  const rotateY = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).rotateY);
  const zIndex = useTransform(rotation, (value) => getPackWheelStyle(index, value, packCount, radius, isMobile).zIndex);
  const frontCloseness = useTransform(rotation, (value) =>
    getPackWheelStyle(index, value, packCount, radius, isMobile).frontCloseness,
  );
  const glowOpacity = useTransform(frontCloseness, [0, 1], isMobile ? [0, isDragging ? 0.12 : 0.28] : [0, 1]);
  const brightness = useTransform(frontCloseness, [0, 1], [
    isMobile || isDragging ? 'none' : 'brightness(0.72) saturate(0.85)',
    isMobile || isDragging ? 'none' : 'brightness(1.08) saturate(1.08)',
  ]);

  return (
    <Card
      component={motion.div}
      onClick={() => onCenterPack(index)}
      sx={{
        position: 'absolute',
        left: '50%',
        top: { xs: 22, sm: 30 },
        ml: { xs: '-92px', sm: '-132px', md: '-146px' },
        width: { xs: 184, sm: 264, md: 292 },
        height: { xs: 304, sm: 430, md: 470 },
        overflow: 'visible',
        bgcolor: 'transparent',
        color: 'text.primary',
        cursor: 'pointer',
        borderRadius: '28px 28px 18px 18px',
        border: 0,
        boxShadow: 'none',
      }}
      style={{
        x,
        y,
        z,
        scale,
        opacity,
        rotateY,
        zIndex,
        filter: brightness,
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
      }}
    >
      <Box sx={{ position: 'relative', height: '100%' }}>
        <PackCard isActive={isActive} pack={pack} setInfo={setInfo} />
        <Box
          component={motion.div}
          style={{ opacity: glowOpacity }}
          sx={{
            position: 'absolute',
            inset: -1,
            borderRadius: '28px 28px 18px 18px',
            boxShadow:
              isMobile
                ? '0 0 20px rgba(244, 201, 93, 0.14), 0 14px 30px rgba(0, 0, 0, 0.36)'
                : '0 0 58px rgba(244, 201, 93, 0.38), 0 0 120px rgba(143, 124, 255, 0.18), 0 24px 70px rgba(0, 0, 0, 0.52)',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Card>
  );
}

export default function PackSelection() {
  const { setCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const normalizedSetCode = setCode?.trim().toLowerCase() || '';
  const [cards, setCards] = useState([]);
  const [artCards, setArtCards] = useState([]);
  const [loadedSetInfo, setLoadedSetInfo] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBoosterDialogOpen, setIsBoosterDialogOpen] = useState(false);
  const [packShards, setPackShards] = useState(() => getPackShards());
  const [packQuantity, setPackQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const rotation = useMotionValue(0);
  const activeIndexRef = useRef(0);
  const liveActiveIndexRef = useRef(0);
  const startRotationRef = useRef(0);
  const animationControlsRef = useRef(null);

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

    async function loadCards() {
      try {
        setIsLoading(true);
        setError('');
        setLoadedSetInfo(null);
        const [scryfallCards, scryfallArtCards, scryfallSets] = await Promise.all([
          getCardsBySet(normalizedSetCode),
          getArtCardsBySet(normalizedSetCode),
          getSets().catch(() => []),
        ]);

        if (isMounted) {
          setCards(scryfallCards);
          setArtCards(scryfallArtCards);
          setLoadedSetInfo(scryfallSets.find((set) => set.code === normalizedSetCode) || null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Cards for this set could not be loaded.');
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
  const setInfo = useMemo(
    () => ({
      code: normalizedSetCode,
      name: loadedSetInfo?.name || setName,
      iconUrl: loadedSetInfo?.icon_svg_uri || null,
    }),
    [loadedSetInfo, normalizedSetCode, setName],
  );
  const packOptions = useMemo(() => buildPackOptions(cards, artCards, normalizedSetCode), [
    artCards,
    cards,
    normalizedSetCode,
  ]);
  const wrappedActiveIndex = packOptions.length ? wrapIndex(activeIndex, packOptions.length) : 0;
  const activePack = packOptions[wrappedActiveIndex] || packOptions[0];
  const angleStep = packOptions.length ? 360 / packOptions.length : 0;
  const dragSensitivity = isMobile ? MOBILE_DRAG_SENSITIVITY : DESKTOP_DRAG_SENSITIVITY;
  const velocityProjection = isMobile ? MOBILE_VELOCITY_PROJECTION : DESKTOP_VELOCITY_PROJECTION;
  const maxPacksPerFlick = isMobile ? MOBILE_MAX_PACKS_PER_FLICK : DESKTOP_MAX_PACKS_PER_FLICK;
  const springConfig = isMobile ? MOBILE_SPRING_CONFIG : DESKTOP_SPRING_CONFIG;
  const swipeThreshold = isMobile ? 28 : 60;
  const wheelRadius = isMobile ? 190 : 360;
  const collectorBoosterTotalCost = COLLECTOR_BOOSTER_COST * packQuantity;
  const canAffordSelectedCollectorBoosters = packShards >= collectorBoosterTotalCost;
  const isCollectorOnly = isCollectorOnlySet(normalizedSetCode);
  const missingCollectorShards = Math.max(collectorBoosterTotalCost - packShards, 0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    animationControlsRef.current?.stop();
    const centeredIndex = packOptions.length ? getCenteredIndexFromRotation(rotation.get(), packOptions.length) : 0;
    setActiveIndex(centeredIndex);
    activeIndexRef.current = centeredIndex;
    liveActiveIndexRef.current = centeredIndex;
  }, [normalizedSetCode, packOptions.length, rotation]);

  function animateToCenteredPack(centeredIndex, snappedRotation) {
    liveActiveIndexRef.current = centeredIndex;
    activeIndexRef.current = centeredIndex;
    setActiveIndex(centeredIndex);
    animationControlsRef.current?.stop();
    animationControlsRef.current = animate(rotation, snappedRotation, springConfig);
  }

  const goNext = useCallback(() => {
    if (!packOptions.length) {
      return;
    }

    const nextRotation = rotation.get() - 360 / packOptions.length;
    const centeredIndex = getCenteredIndexFromRotation(nextRotation, packOptions.length);
    animateToCenteredPack(centeredIndex, nextRotation);
  }, [packOptions.length, rotation]);

  const goPrev = useCallback(() => {
    if (!packOptions.length) {
      return;
    }

    const nextRotation = rotation.get() + 360 / packOptions.length;
    const centeredIndex = getCenteredIndexFromRotation(nextRotation, packOptions.length);
    animateToCenteredPack(centeredIndex, nextRotation);
  }, [packOptions.length, rotation]);

  function handlePackQuantityChange(_, nextQuantity) {
    if (PACK_QUANTITY_OPTIONS.includes(nextQuantity)) {
      setPackQuantity(nextQuantity);
      setActionError('');
    }
  }

  function getOpenButtonLabel(boosterType) {
    const quantityText = packQuantity === 10 ? '10 ' : '';

    return boosterType === 'collector'
      ? `Open ${quantityText}Collector Booster${packQuantity === 10 ? 's' : ''}`
      : `Open ${quantityText}Play Booster${packQuantity === 10 ? 's' : ''}`;
  }

  function openPack(pack, boosterType = 'play') {
    // UI guard mirrors PackOpening's hard guard so route navigation cannot bypass locks.
    setActionError('');
    const centeredIndex = wrapIndex(liveActiveIndexRef.current, packOptions.length);
    const selectedPack = pack || packOptions[centeredIndex] || activePack;

    if (!selectedPack) {
      return;
    }

    if (isCollectorOnly && boosterType !== 'collector') {
      setActionError('This set is collector-only and cannot be opened as a Play Booster.');
      return;
    }

    if (boosterType === 'collector' && packShards < collectorBoosterTotalCost) {
      setActionError(
        `You need ${missingCollectorShards.toLocaleString()} more Pack Shards to open ${packQuantity} Collector Booster${packQuantity === 1 ? '' : 's'}.`,
      );
      return;
    }

    navigate(`/open/${normalizedSetCode}?quantity=${packQuantity}`, {
      state: {
        packArtwork: selectedPack.artwork,
        packArtworkCardName: selectedPack.artworkCardName,
        packName: selectedPack.name,
        setIconUrl: setInfo.iconUrl,
        setName: setInfo.name,
        boosterType,
        packQuantity,
        openingId: `${normalizedSetCode}-${boosterType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });
  }

  function openBoosterDialog() {
    if (activePack) {
      setActionError('');
      setIsBoosterDialogOpen(true);
    }
  }

  function openSelectedPack(boosterType = 'play') {
    setIsBoosterDialogOpen(false);
    openPack(packOptions[wrappedActiveIndex], boosterType);
  }

  function handleDragEnd(_, info) {
    setIsDragging(false);

    if (!packOptions.length) {
      return;
    }

    const current = rotation.get();
    const projected = current + info.velocity.x * velocityProjection;
    const maxDelta = angleStep * maxPacksPerFlick;
    const clampedProjected = clamp(projected, startRotationRef.current - maxDelta, startRotationRef.current + maxDelta);
    const dragDelta = clampedProjected - startRotationRef.current;
    const thresholdRotation = angleStep * (swipeThreshold / 100);
    const rawSnappedRotation =
      Math.abs(dragDelta) > thresholdRotation
        ? startRotationRef.current + Math.sign(dragDelta) * Math.max(angleStep, Math.round(Math.abs(dragDelta) / angleStep) * angleStep)
        : Math.round(clampedProjected / angleStep) * angleStep;
    const snappedRotation = clamp(rawSnappedRotation, startRotationRef.current - maxDelta, startRotationRef.current + maxDelta);
    const centeredIndex = getCenteredIndexFromRotation(snappedRotation, packOptions.length);

    animateToCenteredPack(centeredIndex, snappedRotation);
  }

  function centerPack(packIndex) {
    if (!packOptions.length) {
      return;
    }

    const baseTarget = -packIndex * (360 / packOptions.length);
    const turns = Math.round((rotation.get() - baseTarget) / 360);
    animateToCenteredPack(packIndex, baseTarget + turns * 360);
  }

  function handleDrag(_, info) {
    rotation.set(startRotationRef.current + info.offset.x * dragSensitivity);
  }

  function handleDragStart() {
    setIsDragging(true);
    animationControlsRef.current?.stop();
    startRotationRef.current = rotation.get();
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 96px)' }}>
      <PageHeader eyebrow={normalizedSetCode.toUpperCase()} title="Choose your pack">
        {isCollectorOnly
          ? `${setName} is collector-edition only. It can be opened with a Collector Booster when you have enough Pack Shards.`
          : `Pick a wrapper for ${setName}, then open a free Play Booster or spend Pack Shards on a mostly foil Collector Booster.`}
      </PageHeader>

      <Button component={Link} startIcon={<ArrowBackIcon />} to="/sets" variant="outlined" sx={{ mb: 4 }}>
        Change Set
      </Button>

      {isLoading && <PackSkeletons />}

      {!isLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error} Try changing sets or refreshing this page.
        </Alert>
      )}

      {!isLoading && !error && packOptions.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No usable pack artwork was found for this set. Try another set.
        </Alert>
      )}

      {!isLoading && !error && packOptions.length > 0 && (
        <Box
          className={[
            'packSelectionSurface',
            isMobile ? 'mobileCarousel' : '',
            isMobile && isDragging ? 'mobileDragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
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
              isMobile
                ? 'radial-gradient(circle at 50% 42%, rgba(244,201,93,0.1), transparent 18rem), rgba(3,5,13,0.78)'
                : 'radial-gradient(circle at 50% 42%, rgba(244,201,93,0.16), transparent 28rem), radial-gradient(circle at 50% 64%, rgba(76,201,240,0.1), transparent 32rem), rgba(3,5,13,0.72)',
          }}
        >
          {!isMobile && <MagicalParticles />}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h2" sx={{ fontSize: { xs: 30, md: 38 }, mb: 0.5 }}>
              Choose Your Pack
            </Typography>
            <Typography color="text.secondary">
              {isCollectorOnly ? 'Collector-only set. Requires a Collector Booster.' : 'Browse the sealed wrappers, then choose a booster type.'}
            </Typography>
            <Chip
              color="warning"
              label={`${packShards.toLocaleString()} Pack Shards`}
              sx={{ mt: 1.5, fontWeight: 900 }}
              variant="outlined"
            />
            <Box sx={{ display: 'grid', justifyItems: 'center', mt: 1.5 }}>
              <ToggleButtonGroup
                exclusive
                onChange={handlePackQuantityChange}
                size="small"
                value={packQuantity}
                sx={{
                  bgcolor: 'rgba(5, 7, 17, 0.62)',
                  border: '1px solid rgba(248, 247, 255, 0.14)',
                  borderRadius: 2,
                  p: 0.35,
                }}
              >
                <ToggleButton value={1}>1x</ToggleButton>
                <ToggleButton value={10}>10x</ToggleButton>
              </ToggleButtonGroup>
              <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800, mt: 0.75 }}>
                {packQuantity === 10 ? 'Open 10 packs in one bulk reveal.' : 'Open one pack with the classic reveal.'}
              </Typography>
            </Box>
            {isCollectorOnly && (
              <Chip
                color="warning"
                icon={<LockIcon />}
                label="Collector Only"
                sx={{ mt: 1.5, ml: { xs: 0, sm: 1 }, fontWeight: 900 }}
                variant="filled"
              />
            )}
          </Box>

          {isCollectorOnly && (
            <Alert severity="warning" sx={{ width: '100%', maxWidth: 760 }} variant="outlined">
              {getCollectorOnlySetReason(normalizedSetCode)}
            </Alert>
          )}

          {actionError && (
            <Alert severity="error" sx={{ width: '100%', maxWidth: 760 }} onClose={() => setActionError('')}>
              {actionError}
            </Alert>
          )}

          <Box
            className="carouselStage"
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 1040,
              height: { xs: 390, sm: 520, md: 560 },
              overflow: 'hidden',
              touchAction: 'pan-y',
              perspective: { xs: '850px', sm: '1200px' },
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
                  isMobile
                    ? 'radial-gradient(circle, rgba(244, 201, 93, 0.12), rgba(143, 124, 255, 0.06) 42%, transparent 66%)'
                    : 'radial-gradient(circle, rgba(244, 201, 93, 0.22), rgba(143, 124, 255, 0.14) 42%, transparent 68%)',
                filter: { xs: 'none', sm: 'blur(8px)' },
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
              {packOptions.map((pack, index) => (
                <WheelPack
                  key={pack.id}
                  index={index}
                  isActive={index === wrappedActiveIndex}
                  isDragging={isDragging}
                  isMobile={isMobile}
                  onCenterPack={centerPack}
                  pack={pack}
                  packCount={packOptions.length}
                  radius={wheelRadius}
                  rotation={rotation}
                  setInfo={setInfo}
                />
              ))}
            </Box>

            <Box
              component={motion.div}
              className="dragLayer"
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
                touchAction: isMobile ? 'none' : 'pan-y',
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
            />

            <Box
              component="button"
              type="button"
              aria-label="Open selected pack"
              onClick={openBoosterDialog}
              sx={{
                position: 'absolute',
                left: '50%',
                top: { xs: 22, sm: 30 },
                zIndex: 25,
                width: { xs: 184, sm: 264, md: 292 },
                height: { xs: 304, sm: 430, md: 470 },
                ml: { xs: '-92px', sm: '-132px', md: '-146px' },
                appearance: 'none',
                border: 0,
                borderRadius: '28px 28px 18px 18px',
                bgcolor: 'transparent',
                cursor: 'pointer',
                p: 0,
                '&:focus-visible': {
                  outline: '3px solid rgba(244, 201, 93, 0.78)',
                  outlineOffset: 6,
                },
              }}
            />
          </Box>

          <Typography color="text.secondary" fontWeight={700}>
            Click the centered pack, or swipe to browse.
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: 13, textAlign: 'center' }}>
            Active pack: {wrappedActiveIndex + 1} / {packOptions.length}
            {activePack?.artworkCardName ? ` - ${activePack.artworkCardName}` : ''}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
              width: '100%',
              maxWidth: 760,
            }}
          >
            {!isCollectorOnly && (
              <Card sx={{ borderColor: 'rgba(244, 201, 93, 0.5)' }}>
                <CardContent sx={{ display: 'grid', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="h5">Play Booster</Typography>
                    <Chip color="success" label="Free" size="small" />
                  </Box>
                  <Typography color="text.secondary">
                    A standard 15-card opening from the selected set.
                  </Typography>
                  <Button
                    disabled={!activePack}
                    onClick={() => openPack(undefined, 'play')}
                    size="large"
                    startIcon={<AutoAwesomeIcon />}
                    variant="contained"
                  >
                    {getOpenButtonLabel('play')}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card
              sx={{
                borderColor:
                  canAffordSelectedCollectorBoosters ? 'rgba(244, 201, 93, 0.74)' : 'rgba(248, 247, 255, 0.12)',
                opacity: canAffordSelectedCollectorBoosters ? 1 : 0.72,
                boxShadow: canAffordSelectedCollectorBoosters
                  ? '0 0 38px rgba(244, 201, 93, 0.18), 0 0 80px rgba(143, 124, 255, 0.12)'
                  : undefined,
              }}
            >
              <CardContent sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="h5">Collector Booster</Typography>
                  <Chip
                    color={canAffordSelectedCollectorBoosters ? 'warning' : 'default'}
                    icon={canAffordSelectedCollectorBoosters ? undefined : <LockIcon />}
                    label={`${collectorBoosterTotalCost.toLocaleString()} shards`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography color="text.secondary">
                  Mostly foil cards, with premium rare and mythic slots for a flashier opening.
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  Balance: {packShards.toLocaleString()} shards
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  Cost: {COLLECTOR_BOOSTER_COST.toLocaleString()} each · {packQuantity}x total: {collectorBoosterTotalCost.toLocaleString()} shards
                </Typography>
                {!canAffordSelectedCollectorBoosters && (
                  <Alert severity="info" variant="outlined">
                    Need {missingCollectorShards.toLocaleString()} more Pack Shards.
                  </Alert>
                )}
                <Button
                  disabled={!activePack || !canAffordSelectedCollectorBoosters}
                  onClick={() => openPack(undefined, 'collector')}
                  size="large"
                  startIcon={canAffordSelectedCollectorBoosters ? <AutoAwesomeIcon /> : <LockIcon />}
                  variant={canAffordSelectedCollectorBoosters ? 'contained' : 'outlined'}
                >
                  {canAffordSelectedCollectorBoosters ? getOpenButtonLabel('collector') : `Need ${missingCollectorShards.toLocaleString()} more shards`}
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Dialog
            fullWidth
            maxWidth="xs"
            onClose={() => setIsBoosterDialogOpen(false)}
            open={isBoosterDialogOpen}
            PaperProps={{
              sx: {
                border: '1px solid rgba(244, 201, 93, 0.28)',
                background:
                  'linear-gradient(180deg, rgba(17, 20, 38, 0.98), rgba(5, 7, 17, 0.98))',
              },
            }}
          >
            <DialogTitle sx={{ pb: 0.5 }}>Open {activePack?.name || 'Pack'}</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 1.25, pt: 1 }}>
              <Typography color="text.secondary">
                {isCollectorOnly
                  ? `${setInfo.name} is collector-only and requires a Collector Booster.`
                  : `${setInfo.name} is ready as a free Play Booster.`}{' '}
                Collector Booster costs {COLLECTOR_BOOSTER_COST.toLocaleString()} shards each.
              </Typography>
              <Box>
                <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>
                  Pack quantity
                </Typography>
                <ToggleButtonGroup exclusive onChange={handlePackQuantityChange} size="small" value={packQuantity}>
                  <ToggleButton value={1}>1x</ToggleButton>
                  <ToggleButton value={10}>10x</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Chip
                color="warning"
                label={`${packShards.toLocaleString()} Pack Shards`}
                sx={{ justifySelf: 'start', fontWeight: 900 }}
                variant="outlined"
              />
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Collector total: {collectorBoosterTotalCost.toLocaleString()} Pack Shards
              </Typography>
              {!canAffordSelectedCollectorBoosters && (
                <Alert severity="info" variant="outlined">
                  Need {missingCollectorShards.toLocaleString()} more Pack Shards.
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ display: 'grid', gap: 1, p: 3, pt: 1.5 }}>
              {!isCollectorOnly && (
                <Button
                  autoFocus={state?.preferredBoosterType !== 'collector'}
                  disabled={!activePack}
                  onClick={() => openSelectedPack('play')}
                  size="large"
                  startIcon={<AutoAwesomeIcon />}
                  variant="contained"
                >
                  {getOpenButtonLabel('play')}
                </Button>
              )}
              <Button
                autoFocus={isCollectorOnly || state?.preferredBoosterType === 'collector'}
                disabled={!activePack || !canAffordSelectedCollectorBoosters}
                onClick={() => openSelectedPack('collector')}
                size="large"
                startIcon={canAffordSelectedCollectorBoosters ? <AutoAwesomeIcon /> : <LockIcon />}
                variant="outlined"
              >
                {canAffordSelectedCollectorBoosters ? getOpenButtonLabel('collector') : `Need ${missingCollectorShards.toLocaleString()} more shards`}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
