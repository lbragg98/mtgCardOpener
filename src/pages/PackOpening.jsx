import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import StyleIcon from '@mui/icons-material/Style';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Fade, Snackbar, Typography, Zoom } from '@mui/material';
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { saveCardsToCollection } from '../utils/collectionStorage.js';
import { generatePlayBooster } from '../utils/packGenerator.js';

const SWIPE_THRESHOLD = 120;
const CUT_THRESHOLD = 170;
const PHASES = {
  cutPack: 'cutPack',
  revealCards: 'revealCards',
  summary: 'summary',
};

function PackCuttingScreen({ artwork, setCode, onCutComplete }) {
  const cutterControls = useAnimation();
  const cutterTrackRef = useRef(null);
  const [isCut, setIsCut] = useState(false);
  const packBackground = artwork
    ? `linear-gradient(180deg, rgba(5,7,17,0.02), rgba(5,7,17,0.82)), url(${artwork})`
    : 'linear-gradient(160deg, rgba(143,124,255,0.92), rgba(5,7,17,0.92) 46%, rgba(244,201,93,0.82))';

  async function handleDragEnd(_, info) {
    if (isCut) {
      return;
    }

    if (info.offset.x > CUT_THRESHOLD || info.velocity.x > 760) {
      setIsCut(true);
      const trackWidth = cutterTrackRef.current?.getBoundingClientRect().width || 287;
      await cutterControls.start({ x: Math.max(trackWidth - 42, 0), scale: 1.08, transition: { duration: 0.18 } });
      window.setTimeout(onCutComplete, 900);
      return;
    }

    cutterControls.start({ x: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 28 } });
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: '100vh',
        overflow: 'hidden',
        placeItems: 'center',
        bgcolor: '#03050d',
        background:
          'radial-gradient(circle at 50% 36%, rgba(76, 201, 240, 0.18), transparent 28rem), radial-gradient(circle at 50% 90%, rgba(244, 201, 93, 0.12), transparent 30rem), #03050d',
        px: 2,
      }}
    >
      <Box sx={{ position: 'absolute', top: { xs: 24, md: 34 }, left: 0, right: 0, textAlign: 'center' }}>
        <Typography color="warning.main" fontWeight={900}>
          {setCode.toUpperCase()} Play Booster
        </Typography>
        <Typography color="text.secondary">Swipe across the top seal to open</Typography>
      </Box>

      <Box sx={{ position: 'relative', width: { xs: '76vw', sm: 320 }, maxWidth: 340, height: { xs: 500, sm: 520 } }}>
        <motion.div
          animate={isCut ? { y: -96, rotate: -3, opacity: 0.96 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: '0 0 90% 0',
            overflow: 'hidden',
            borderRadius: '24px 24px 6px 6px',
            backgroundImage: packBackground,
            backgroundPosition: 'center top',
            backgroundSize: 'cover',
            boxShadow: '0 0 42px rgba(244, 201, 93, 0.2), 0 22px 70px rgba(0, 0, 0, 0.56)',
          }}
        />
        <motion.div
          animate={isCut ? { y: 42, scale: 0.98 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: '10% 0 0 0',
            overflow: 'hidden',
            borderRadius: '6px 6px 24px 24px',
            backgroundImage: packBackground,
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover',
            boxShadow: '0 28px 90px rgba(0, 0, 0, 0.62)',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            border: '1px solid rgba(248, 247, 255, 0.24)',
            borderRadius: 6,
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: 18,
            right: 18,
            height: 4,
            borderRadius: 999,
            bgcolor: 'rgba(244, 201, 93, 0.28)',
            boxShadow: '0 0 22px rgba(244, 201, 93, 0.72)',
          }}
        >
          <motion.div
            animate={{ x: ['-8%', '108%'] }}
            transition={{ duration: 1.25, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 70,
              height: 4,
              borderRadius: 999,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)',
            }}
          />
        </Box>

        {isCut && (
          <motion.div
            initial={{ opacity: 0, scale: 0.35 }}
            animate={{ opacity: [0, 1, 0], scale: [0.35, 1.6, 2.2] }}
            transition={{ duration: 0.75 }}
            style={{
              position: 'absolute',
              top: '7%',
              left: '50%',
              width: 180,
              height: 180,
              marginLeft: -90,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244,201,93,0.75), rgba(143,124,255,0.24) 45%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <Box
          ref={cutterTrackRef}
          sx={{
            position: 'absolute',
            top: 'calc(10% - 18px)',
            left: 22,
            right: 22,
            height: 40,
          }}
        >
          <motion.div
            animate={cutterControls}
            drag="x"
            dragConstraints={cutterTrackRef}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #f4c95d, #fff4ba)',
              boxShadow: '0 0 22px rgba(244, 201, 93, 0.96)',
              cursor: 'grab',
              touchAction: 'none',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function RevealCard({ card, cardNumber, exitX, onAdvance }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-13, 13]);
  const scale = useTransform(x, [-260, 0, 260], [0.94, 1, 0.94]);
  const isFinale = card.isFoil || ['rare', 'mythic'].includes(card.rarity);

  return (
    <>
    <AnimatePresence custom={exitX} mode="wait">
      <motion.div
        key={`${card.id}-${cardNumber}`}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.28}
        initial={{ opacity: 0, y: 34, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={(customExitX) => ({
          opacity: 0,
          x: customExitX,
          rotate: customExitX > 0 ? 18 : -18,
          scale: 0.86,
        })}
        transition={{ duration: 0.26, ease: 'easeOut' }}
        onClick={() => onAdvance(1)}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > SWIPE_THRESHOLD || Math.abs(info.velocity.x) > 650) {
            onAdvance(info.offset.x >= 0 ? 1 : -1);
          }
        }}
        style={{ x, rotate, scale, cursor: 'grab', touchAction: 'pan-y' }}
      >
        <Box
          className={card.isFoil ? 'foil-card' : ''}
          sx={{
            position: 'relative',
            width: { xs: '78vw', sm: 360, md: 420 },
            maxWidth: 440,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: isFinale
              ? '0 0 42px rgba(244, 201, 93, 0.36), 0 0 90px rgba(143, 124, 255, 0.24)'
              : '0 20px 70px rgba(0, 0, 0, 0.58)',
          }}
        >
          <Box
            component="img"
            src={card.image}
            alt={card.name}
            draggable={false}
            sx={{
              display: 'block',
              width: '100%',
              userSelect: 'none',
            }}
          />
        </Box>
      </motion.div>
    </AnimatePresence>

      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 92, md: 78 },
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography color={isFinale ? 'warning.main' : 'text.secondary'} fontWeight={900}>
          {card.isFoil ? 'Foil ' : ''}
          {card.rarity?.toUpperCase()} • {card.packSlot}
        </Typography>
      </Box>
    </>
  );
}

function SummaryGrid({ pack, setCode }) {
  return (
    <Box sx={{ minHeight: '100vh', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Box sx={{ mx: 'auto', maxWidth: 920 }}>
        <Typography color="warning.main" fontWeight={900} gutterBottom>
          {setCode.toUpperCase()} opened
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mb: 3, fontSize: { xs: 32, md: 40 } }}>
          Pack Summary
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(5, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, md: 1.75 },
            mb: 4,
          }}
        >
          {pack.map((card) => (
            <Card
              key={`${card.id}-${card.packSlot}`}
              className={card.isFoil ? 'foil-card' : ''}
              sx={{ position: 'relative', overflow: 'hidden', minWidth: 0 }}
            >
              <Box
                component="img"
                src={card.image}
                alt={card.name}
                sx={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '488 / 680',
                  objectFit: 'contain',
                  bgcolor: 'rgba(0, 0, 0, 0.32)',
                }}
              />
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                  {card.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.isFoil ? 'Foil ' : ''}
                  {card.rarity}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button component={Link} startIcon={<AutoAwesomeIcon />} to={`/packs/${setCode}`} variant="contained">
            Open another pack
          </Button>
          <Button component={Link} startIcon={<StyleIcon />} to="/sets" variant="outlined">
            Choose another set
          </Button>
          <Button component={Link} startIcon={<CollectionsBookmarkIcon />} to="/collection" variant="outlined">
            View Collection
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function PackOpening() {
  const { setCode } = useParams();
  const { state } = useLocation();
  const normalizedSetCode = setCode?.trim().toLowerCase() || '';
  const [pack, setPack] = useState([]);
  const [phase, setPhase] = useState(PHASES.cutPack);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(520);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSavedPack, setHasSavedPack] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPack() {
      try {
        setIsLoading(true);
        setError('');
        setPhase(PHASES.cutPack);
        setCurrentIndex(0);
        setHasSavedPack(false);
        setSavedMessage('');
        const generatedPack = await generatePlayBooster(normalizedSetCode);

        if (isMounted) {
          setPack(generatedPack);
        }
      } catch (packError) {
        if (isMounted) {
          setError(packError.message || 'Unable to generate this pack.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (normalizedSetCode) {
      loadPack();
    }

    return () => {
      isMounted = false;
    };
  }, [normalizedSetCode]);

  const advanceCard = useCallback((direction = 1) => {
    setExitX(direction >= 0 ? 520 : -520);
    setCurrentIndex((index) => {
      const nextIndex = Math.min(index + 1, pack.length);

      if (nextIndex >= pack.length) {
        setPhase(PHASES.summary);
      }

      return nextIndex;
    });
  }, [pack.length]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (phase === PHASES.revealCards && event.key === 'ArrowRight' && currentIndex < pack.length) {
        advanceCard();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advanceCard, currentIndex, pack.length, phase]);

  useEffect(() => {
    if (phase === PHASES.summary && pack.length > 0 && !hasSavedPack) {
      const savedCards = saveCardsToCollection(pack);
      setHasSavedPack(true);
      setSavedMessage(`${savedCards.length} cards saved to your collection.`);
    }
  }, [hasSavedPack, pack, phase]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'grid',
          minHeight: '100vh',
          placeItems: 'center',
          bgcolor: '#03050d',
          px: 2,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="warning" sx={{ mb: 3 }} />
          <Typography color="text.secondary">Generating pack...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#03050d', px: 2, py: 4 }}>
        <Alert severity="error" sx={{ mx: 'auto', maxWidth: 720 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (phase === PHASES.summary) {
    return (
      <>
        <SummaryGrid pack={pack} setCode={normalizedSetCode} />
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          autoHideDuration={4200}
          onClose={() => setSavedMessage('')}
          open={Boolean(savedMessage)}
        >
          <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
            {savedMessage}
          </Alert>
        </Snackbar>
      </>
    );
  }

  if (phase === PHASES.cutPack) {
    const fallbackArtwork = pack.find((card) => card.rarity === 'mythic')?.image || pack.find((card) => card.image)?.image;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="cut-pack"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.32 }}
        >
          <PackCuttingScreen
            artwork={state?.packArtwork || fallbackArtwork}
            setCode={normalizedSetCode}
            onCutComplete={() => setPhase(PHASES.revealCards)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  const activeCard = pack[currentIndex];
  const isFinalStretch = currentIndex >= pack.length - 3;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: '100vh',
        overflow: 'hidden',
        placeItems: 'center',
        bgcolor: '#03050d',
        background:
          'radial-gradient(circle at 50% 42%, rgba(143, 124, 255, 0.2), transparent 28rem), radial-gradient(circle at 50% 100%, rgba(244, 201, 93, 0.12), transparent 30rem), #03050d',
        px: 2,
      }}
    >
      <Box sx={{ position: 'absolute', top: { xs: 20, md: 28 }, left: 0, right: 0, textAlign: 'center' }}>
        <Typography color="text.secondary" fontWeight={800}>
          Card {currentIndex + 1} / {pack.length}
        </Typography>
      </Box>

      <Fade in timeout={260} key={`fade-${activeCard.id}-${currentIndex}`}>
        <Box sx={{ position: 'relative' }}>
          <Zoom in timeout={260}>
            <Box>
              <RevealCard
                card={activeCard}
                cardNumber={currentIndex + 1}
                exitX={exitX}
                onAdvance={advanceCard}
              />
            </Box>
          </Zoom>
        </Box>
      </Fade>

      {isFinalStretch && (
        <Typography
          color="warning.main"
          fontWeight={900}
          sx={{ position: 'absolute', top: { xs: 52, md: 62 }, textAlign: 'center' }}
        >
          Final reveal
        </Typography>
      )}

      <Button
        endIcon={<KeyboardArrowRightIcon />}
        onClick={advanceCard}
        variant="contained"
        sx={{ position: 'absolute', bottom: { xs: 24, md: 32 } }}
      >
        Next
      </Button>
    </Box>
  );
}
