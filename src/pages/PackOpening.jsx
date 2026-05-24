// PackOpening owns the full open flow: cut pack, reveal stable generated cards, save summary.
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import StyleIcon from "@mui/icons-material/Style";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  Snackbar,
  Typography,
  useMediaQuery,
  Zoom,
} from "@mui/material";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CardImage from "../components/CardImage.jsx";
import BulkPackHighlights from "../components/BulkPackHighlights.jsx";
import BulkPackOpening from "../components/BulkPackOpening.jsx";
import BulkPackSummary from "../components/BulkPackSummary.jsx";
import EquippedRevealEffect from "../components/EquippedRevealEffect.jsx";
import FoilAmbientScene from "../components/FoilAmbientScene.jsx";
import FoilImpactScene from "../components/FoilImpactScene.jsx";
import InspectableFoilCard from "../components/InspectableFoilCard.jsx";
import MobileFoilRevealCard from "../components/MobileFoilRevealCard.jsx";
import OneOfOneRingReveal, { OneOfOneRingAtmosphere } from "../components/OneOfOneRingReveal.jsx";
import OpeningSceneBackground from "../components/OpeningSceneBackground.jsx";
import SealedPack from "../components/SealedPack.jsx";
import TearEffect from "../components/TearEffect.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCosmetics } from "../context/CosmeticsContext.jsx";
import { getCardPriceLabel } from "../utils/cardPricing.js";
import { getCloudPackShards, spendCloudPackShards } from "../api/packShards.js";
import { saveOpenedCards } from "../api/userCards.js";
import { isOneOfOneRing } from "../utils/collectorExclusiveCards.js";
import {
  getPackShards,
  saveCardsToCollection,
  spendPackShards,
} from "../utils/collectionStorage.js";
import { isCollectorOnlySet } from "../utils/collectorOnlySets.js";
import {
  FOIL_LABELS,
  FOIL_TREATMENTS,
  normalizeFoilTreatment,
} from "../utils/foilTypes.js";
import {
  generateMultipleBoosters,
} from "../utils/packGenerator.js";
import {
  getFoilAnimationConfig,
  getFoilRevealMotion,
} from "../utils/foilAnimations.js";

const SWIPE_THRESHOLD = 120;
const CUT_THRESHOLD = 170;
const COLLECTOR_BOOSTER_COST = 1000;
const REVEAL_CARD_WIDTH = { xs: "min(76vw, 42vh)", sm: 360, md: 420 };
const MASS_SUMMARY_PAGE_SIZE = 50;
const PHASES = {
  cutPack: "cutPack",
  revealCards: "revealCards",
  summary: "summary",
  bulkOpening: "bulkOpening",
  bulkHighlights: "bulkHighlights",
  bulkSummary: "bulkSummary",
};

function normalizePackQuantity(value) {
  return Number(value) === 10 ? 10 : 1;
}

function isRealSaveableCard(card) {
  const typeLine = card?.type_line?.toLowerCase() || "";

  return Boolean(
    card?.id &&
      card?.name &&
      (card?.image || card?.imageUrl) &&
      card?.set &&
      card?.collector_number &&
      !typeLine.includes("token") &&
      !typeLine.includes("art series"),
  );
}

function mergeSavedCardFlagsForDisplay(allCards, savedCards = []) {
  let savedIndex = 0;

  return allCards.map((card) => {
    if (!isRealSaveableCard(card)) {
      return card;
    }

    const savedCard = savedCards[savedIndex];
    savedIndex += 1;

    return {
      ...card,
      isDuplicatePull: Boolean(savedCard?.isDuplicatePull),
    };
  });
}

function PackCuttingScreen({
  artwork,
  boosterLabel,
  sceneId,
  setCode,
  setIconUrl,
  setName,
  tearEffectId,
  boosterType,
  onCutComplete,
  onSkipToSummary,
}) {
  // The cutting phase is visual only; generation already happened so the pack cannot change later.
  const cutterControls = useAnimation();
  const cutterTrackRef = useRef(null);
  const cutCompleteTimerRef = useRef(null);
  const [isCut, setIsCut] = useState(false);

  useEffect(() => {
    return () => {
      if (cutCompleteTimerRef.current) {
        window.clearTimeout(cutCompleteTimerRef.current);
      }
    };
  }, []);

  async function handleDragEnd(_, info) {
    if (isCut) {
      return;
    }

    if (info.offset.x > CUT_THRESHOLD || info.velocity.x > 760) {
      setIsCut(true);
      const trackWidth =
        cutterTrackRef.current?.getBoundingClientRect().width || 287;
      await cutterControls.start({
        x: Math.max(trackWidth - 42, 0),
        scale: 1.08,
        transition: { duration: 0.18 },
      });
      cutCompleteTimerRef.current = window.setTimeout(onCutComplete, 900);
      return;
    }

    cutterControls.start({
      x: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 420, damping: 28 },
    });
  }

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        minHeight: "100vh",
        overflow: "hidden",
        placeItems: "center",
        bgcolor: "#03050d",
        background:
          "radial-gradient(circle at 50% 36%, rgba(76, 201, 240, 0.1), transparent 28rem), #03050d",
        px: 2,
      }}
    >
      <OpeningSceneBackground phase="cutPack" sceneId={sceneId} />
      <Box
        sx={{
          position: "absolute",
          top: { xs: 24, md: 34 },
          left: 0,
          right: 0,
          zIndex: 1,
          textAlign: "center",
        }}
      >
        <Typography color="warning.main" fontWeight={900}>
          {setCode.toUpperCase()} {boosterLabel}
        </Typography>
        <Typography color="text.secondary">
          Swipe across the top seal to open the pack.
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          width: { xs: "76vw", sm: 320 },
          maxWidth: 340,
          height: { xs: 500, sm: 520 },
          zIndex: 1,
        }}
      >
        <motion.div
          animate={
            isCut
              ? { y: -96, rotate: -3, opacity: 0.96 }
              : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="tornTopStrip"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            clipPath: "inset(0 0 88% 0)",
          }}
        >
          <SealedPack
            accentArtwork={artwork}
            boosterLabel={boosterLabel}
            setCode={setCode}
            setIconUrl={setIconUrl}
            setName={setName}
          />
        </motion.div>
        <motion.div
          animate={isCut ? { y: 42, scale: 0.98 } : { y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            clipPath: "inset(12% 0 0 0)",
          }}
        >
          <SealedPack
            accentArtwork={artwork}
            boosterLabel={boosterLabel}
            setCode={setCode}
            setIconUrl={setIconUrl}
            setName={setName}
          />
        </motion.div>

        <Box className="tearSeam">
          <motion.div
            animate={{ x: ["-8%", "108%"] }}
            transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }}
            className="tearProgress"
          />
        </Box>
        <TearEffect
          boosterType={boosterType}
          isTearing={isCut}
          tearEffectId={tearEffectId}
          tearProgress={isCut ? 1 : 0}
        />

        {isCut && (
          <motion.div
            initial={{ opacity: 0, scale: 0.35 }}
            animate={{ opacity: [0, 1, 0], scale: [0.35, 1.6, 2.2] }}
            transition={{ duration: 0.75 }}
            style={{
              position: "absolute",
              top: "7%",
              left: "50%",
              width: 180,
              height: 180,
              marginLeft: -90,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(244,201,93,0.75), rgba(143,124,255,0.24) 45%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        )}

        <Box
          ref={cutterTrackRef}
          sx={{
            position: "absolute",
            top: "calc(12% - 18px)",
            left: -24,
            right: -24,
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
              background: "linear-gradient(135deg, #f4c95d, #fff4ba)",
              boxShadow: "0 0 22px rgba(244, 201, 93, 0.96)",
              cursor: "grab",
              touchAction: "none",
            }}
          />
        </Box>
      </Box>

      <Button
        endIcon={<KeyboardArrowRightIcon />}
        onClick={onSkipToSummary}
        variant="outlined"
        sx={{
          bottom: { xs: 16, sm: 24, md: 32 },
          position: "absolute",
          right: { xs: 16, sm: 24, md: 32 },
          zIndex: 2,
        }}
      >
        Skip to Summary
      </Button>
    </Box>
  );
}

function RevealCard({ card, cardNumber, exitX, onAdvance, revealEffectId }) {
  // Mobile foil reveals use a simpler path so touch inspection and swiping stay smooth.
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-13, 13]);
  const scale = useTransform(x, [-260, 0, 260], [0.94, 1, 0.94]);
  const [canInspectFoil, setCanInspectFoil] = useState(false);
  const [foilImpactBoom, setFoilImpactBoom] = useState(false);
  const foilTreatment = normalizeFoilTreatment(card);
  const isFinale = card.isFoil || ["rare", "mythic"].includes(card.rarity);
  const rarityLabel = card.isFoil
    ? FOIL_LABELS[foilTreatment]
    : card.rarity?.toUpperCase();
  const cardKey =
    card.collectionTempId || card.id || `${card.name}-${cardNumber}`;
  const foilRevealConfig = getFoilAnimationConfig(card);
  const foilRevealMotion = getFoilRevealMotion(card, isMobile);
  const isFoilReveal = Boolean(card.isFoil);
  const shouldShowEquippedRevealEffect =
    Boolean(revealEffectId) &&
    ["rare", "mythic"].includes(card.rarity) &&
    !card.isFoil &&
    !card.isCollectorExclusive &&
    !isOneOfOneRing(card);
  const revealInitial = isFoilReveal
    ? foilRevealMotion.initial
    : { opacity: 0, y: 20, scale: 0.96 };
  const revealAnimate = isFoilReveal
    ? foilRevealMotion.animate
    : { opacity: 1, y: 0, scale: 1 };
  const revealTransition = isFoilReveal
    ? foilRevealMotion.transition
    : { duration: 0.26, ease: "easeOut" };

  useEffect(() => {
    setCanInspectFoil(false);
    setFoilImpactBoom(false);

    if (!card?.isFoil) {
      return undefined;
    }

    const boomTimer = setTimeout(() => setFoilImpactBoom(true), isMobile ? 320 : 420);
    const cleanupTimer = setTimeout(() => setFoilImpactBoom(false), isMobile ? 3200 : 4600);

    return () => {
      clearTimeout(boomTimer);
      clearTimeout(cleanupTimer);
    };
  }, [card?.isFoil, cardKey, isMobile]);

  if (isMobile && isFoilReveal) {
    return (
      <>
        <AnimatePresence custom={exitX} mode="wait">
          <motion.div
            key={`${cardKey}-${cardNumber}`}
            className="revealCardMotion mobileFoilRevealMotion"
            exit={(customExitX) => ({
              opacity: 0,
              x: customExitX,
              rotate: customExitX > 0 ? 10 : -10,
              scale: 0.9,
            })}
            transition={{ duration: 0.24, ease: "easeOut" }}
            style={{
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <MobileFoilRevealCard
              card={card}
              cardKey={cardKey}
              className={isFinale ? "reveal-special-pulse" : ""}
              onSwipeAway={onAdvance}
              sx={{
                position: "relative",
                width: REVEAL_CARD_WIDTH,
                maxWidth: 420,
                boxShadow:
                  foilTreatment === FOIL_TREATMENTS.NEON_INK
                    ? "0 0 42px rgba(0, 255, 255, 0.34), 0 0 76px rgba(255, 0, 200, 0.22), 0 24px 64px rgba(0, 0, 0, 0.62)"
                    : "0 0 44px rgba(244, 201, 93, 0.34), 0 0 78px rgba(143, 124, 255, 0.22), 0 24px 64px rgba(0, 0, 0, 0.62)",
              }}
            />
          </motion.div>
        </AnimatePresence>

        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 76, sm: 92, md: 78 },
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Chip
            color={
              [
                FOIL_TREATMENTS.GALAXY,
                FOIL_TREATMENTS.GILDED,
                FOIL_TREATMENTS.TEXTURED,
                FOIL_TREATMENTS.NEON_INK,
              ].includes(foilTreatment) || card.rarity === "mythic"
                ? "warning"
                : "secondary"
            }
            label={rarityLabel}
            size="small"
            sx={
              foilTreatment === FOIL_TREATMENTS.NEON_INK
                ? {
                    mt: 1,
                    border: "1px solid rgba(0, 255, 255, 0.72)",
                    bgcolor: "rgba(5, 7, 17, 0.86)",
                    boxShadow: "0 0 18px rgba(255, 0, 200, 0.36)",
                    color: "#8ff",
                    fontWeight: 900,
                  }
                : { mt: 1, fontWeight: 900 }
            }
          />
          {card.isCollectorExclusive && (
            <Chip
              color="warning"
              label="Collector Booster Exclusive"
              size="small"
              sx={{ ml: 1, mt: 1, fontWeight: 900 }}
              variant="outlined"
            />
          )}
        </Box>
      </>
    );
  }

  return (
    <>
      <AnimatePresence custom={exitX} mode="wait">
        <motion.div
          key={`${cardKey}-${cardNumber}`}
          className={[
            "revealCardMotion",
            isFoilReveal ? "revealCardOuter" : "",
            isFoilReveal ? foilRevealConfig.revealClass : "",
            isFoilReveal
              ? `foilRevealSlam foilRevealIntensity-${foilRevealConfig.intensity}`
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          drag={isFoilReveal ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.28}
          initial={revealInitial}
          animate={revealAnimate}
          exit={(customExitX) => ({
            opacity: 0,
            x: customExitX,
            rotate: customExitX > 0 ? 18 : -18,
            scale: 0.86,
          })}
          transition={revealTransition}
          onAnimationComplete={() => {
            if (isFoilReveal) {
              setCanInspectFoil(true);
            }
          }}
          onClick={() => {
            if (!isFoilReveal) {
              onAdvance(1);
            }
          }}
          onDragEnd={(_, info) => {
            if (
              Math.abs(info.offset.x) > SWIPE_THRESHOLD ||
              Math.abs(info.velocity.x) > 650
            ) {
              onAdvance(info.offset.x >= 0 ? 1 : -1);
            }
          }}
          style={{
            x,
            rotate,
            ...(isFoilReveal ? {} : { scale }),
            cursor: "grab",
            touchAction: isFoilReveal && isMobile ? "none" : "pan-y",
          }}
        >
          {isFoilReveal && (
            <>
              <FoilAmbientScene active={canInspectFoil} card={card} isMobile={false} />
              <Box className={`foilRevealAura foilRevealAura-${foilRevealConfig.treatment}`} />
              <FoilImpactScene
                active={foilImpactBoom}
                card={card}
                intensity={foilRevealConfig.intensity}
              />
            </>
          )}
          {shouldShowEquippedRevealEffect && (
            <EquippedRevealEffect
              active
              card={card}
              revealEffectId={revealEffectId}
            />
          )}
          {isFoilReveal ? (
            <InspectableFoilCard
              canInspect={canInspectFoil}
              card={card}
              className={isFinale ? "reveal-special-pulse" : ""}
              onSwipeAway={onAdvance}
              swipeAwayThreshold={isMobile ? 95 : SWIPE_THRESHOLD}
              sx={{
                position: "relative",
                width: REVEAL_CARD_WIDTH,
                maxWidth: 440,
                boxShadow: [
                  FOIL_TREATMENTS.GALAXY,
                  FOIL_TREATMENTS.GILDED,
                  FOIL_TREATMENTS.TEXTURED,
                  FOIL_TREATMENTS.NEON_INK,
                ].includes(foilTreatment)
                  ? foilTreatment === FOIL_TREATMENTS.NEON_INK
                    ? "0 0 76px rgba(0, 255, 255, 0.44), 0 0 138px rgba(255, 0, 200, 0.34), 0 32px 90px rgba(0, 0, 0, 0.64)"
                    : "0 0 82px rgba(244, 201, 93, 0.5), 0 0 150px rgba(143, 124, 255, 0.42), 0 32px 90px rgba(0, 0, 0, 0.64)"
                  : "0 0 58px rgba(244, 201, 93, 0.38), 0 0 115px rgba(76, 201, 240, 0.24), 0 28px 80px rgba(0, 0, 0, 0.6)",
              }}
            />
          ) : (
            <CardImage
              card={card}
              className={isFinale ? "reveal-special-pulse" : ""}
              large
              variant="reveal"
              sx={{
                position: "relative",
                width: REVEAL_CARD_WIDTH,
                maxWidth: 440,
                boxShadow: isFinale
                  ? "0 0 54px rgba(244, 201, 93, 0.42), 0 0 120px rgba(143, 124, 255, 0.3)"
                  : "0 20px 70px rgba(0, 0, 0, 0.58)",
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <Box
        sx={{
          position: "absolute",
          bottom: { xs: 76, sm: 92, md: 78 },
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        {card.isFoil && (
          <Chip
            color={
              [
                FOIL_TREATMENTS.GALAXY,
                FOIL_TREATMENTS.GILDED,
                FOIL_TREATMENTS.TEXTURED,
                FOIL_TREATMENTS.NEON_INK,
              ].includes(foilTreatment) || card.rarity === "mythic"
                ? "warning"
                : "secondary"
            }
            label={rarityLabel}
            size="small"
            sx={
              foilTreatment === FOIL_TREATMENTS.NEON_INK
                ? {
                    mt: 1,
                    border: "1px solid rgba(0, 255, 255, 0.72)",
                    bgcolor: "rgba(5, 7, 17, 0.86)",
                    boxShadow: "0 0 18px rgba(255, 0, 200, 0.36)",
                    color: "#8ff",
                    fontWeight: 900,
                  }
                : { mt: 1, fontWeight: 900 }
            }
          />
        )}
        {card.isCollectorExclusive && (
          <Chip
            color="warning"
            label="Collector Booster Exclusive"
            size="small"
            sx={{ ml: card.isFoil ? 1 : 0, mt: 1, fontWeight: 900 }}
            variant="outlined"
          />
        )}
        {isFoilReveal && canInspectFoil && (
          <Typography
            color="text.secondary"
            sx={{ mt: 1, fontSize: 13, fontWeight: 800 }}
          >
            Drag gently to inspect the foil shine.
          </Typography>
        )}
        {isFinale && !card.isFoil && (
          <Chip
            color={card.rarity === "mythic" ? "warning" : "secondary"}
            label={rarityLabel}
            size="small"
            sx={{ mt: 1, fontWeight: 900 }}
          />
        )}
      </Box>
    </>
  );
}

function SummaryGrid({
  boosterLabel,
  isSaving,
  onSave,
  pack,
  saveError,
  saved,
  saveResult,
  sceneId,
  setCode,
}) {
  const [visibleCardCount, setVisibleCardCount] = useState(MASS_SUMMARY_PAGE_SIZE);
  const isMassOpening = pack.length > MASS_SUMMARY_PAGE_SIZE;
  const visibleCards = isMassOpening ? pack.slice(0, visibleCardCount) : pack;
  const collectorExclusiveHits = pack.filter((card) => card.isCollectorExclusive);
  const oneOfOneRing = pack.find(isOneOfOneRing);
  const bestCollectorExclusiveHit = collectorExclusiveHits
    .filter((card) => card.rarity === "mythic" || card.isFoil)
    .sort((a, b) => Number(b.isFoil) - Number(a.isFoil))[0] || collectorExclusiveHits[0];

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        bgcolor: "#03050d",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      <OpeningSceneBackground phase="summary" sceneId={sceneId} />
      <Box sx={{ position: "relative", zIndex: 1, mx: "auto", maxWidth: 920 }}>
        <Typography color="warning.main" fontWeight={900} gutterBottom>
          {setCode.toUpperCase()} {boosterLabel} opened
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{ mb: 3, fontSize: { xs: 32, md: 40 } }}
        >
          Pack summary
        </Typography>

        {saveError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {saveError}
          </Alert>
        )}

        <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
          <Button
            disabled={isSaving || saved}
            onClick={onSave}
            startIcon={<CollectionsBookmarkIcon />}
            variant="contained"
          >
            {isSaving ? "Saving..." : saved ? "Saved" : "Save to Collection"}
          </Button>
          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
            {saved
              ? `${saveResult?.savedCards?.length || 0} cards saved to your collection.`
              : `${pack.length} pulled cards are ready to save.`}
          </Typography>
        </Box>

        {saveResult && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(6, minmax(0, 1fr))",
              },
              gap: 1.5,
              mb: 3,
            }}
          >
            {[
              { label: "Booster", value: boosterLabel },
              { label: "Cards added", value: saveResult.savedCards.length },
              { label: "Duplicates", value: saveResult.duplicateCount },
              { label: "Shards earned", value: saveResult.shardsAwarded },
              { label: "Shard balance", value: saveResult.newShardBalance },
              { label: "Collector exclusives", value: collectorExclusiveHits.length },
            ].map((stat) => (
              <Card
                key={stat.label}
                sx={{ borderColor: "rgba(244, 201, 93, 0.28)" }}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 12, fontWeight: 800 }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography color="warning.main" fontWeight={950}>
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {collectorExclusiveHits.length > 0 && (
          <Alert severity="success" sx={{ mb: 3 }} variant="outlined">
            Collector-exclusive hit! {bestCollectorExclusiveHit?.name} is ready to save.
          </Alert>
        )}

        {oneOfOneRing && (
          <Alert severity="warning" sx={{ mb: 3 }} variant="filled">
            Legendary One-of-One Pull: The One Ring. Estimated value: {getCardPriceLabel(oneOfOneRing)}.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(5, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, md: 1.75 },
            mb: 4,
          }}
        >
          {visibleCards.map((card, index) => (
            <Card
              key={`${card.id}-${card.packNumber || 1}-${card.bulkCardIndex || card.packSlot || index}`}
              sx={{ position: "relative", overflow: "hidden", minWidth: 0 }}
            >
              <CardImage
                card={card}
                className={isMassOpening ? "massSummaryCardImage" : ""}
                disableFoilEffects={isMassOpening}
                variant="grid"
              />
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                  {card.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.packNumber ? `Pack ${card.packNumber} · ` : ""}{card.rarity}
                </Typography>
                {card.isFoil && (
                  <Chip
                    color="warning"
                    label={FOIL_LABELS[normalizeFoilTreatment(card)]}
                    size="small"
                    sx={
                      normalizeFoilTreatment(card) === FOIL_TREATMENTS.NEON_INK
                        ? {
                            mt: 0.75,
                            maxWidth: "100%",
                            border: "1px solid rgba(0, 255, 255, 0.65)",
                            bgcolor: "rgba(5, 7, 17, 0.86)",
                            color: "#8ff",
                            fontWeight: 900,
                          }
                        : { mt: 0.75, maxWidth: "100%", fontWeight: 900 }
                    }
                  />
                )}
                {card.isCollectorExclusive && (
                  <Chip
                    color="warning"
                    label={isOneOfOneRing(card) ? "1 of 1" : "Collector Booster Exclusive"}
                    size="small"
                    sx={{ mt: 0.75, maxWidth: "100%", fontWeight: 900 }}
                    variant="outlined"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        {isMassOpening && visibleCardCount < pack.length && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
            <Button
              onClick={() => setVisibleCardCount((count) => Math.min(count + MASS_SUMMARY_PAGE_SIZE, pack.length))}
              variant="outlined"
            >
              Show More Cards
            </Button>
          </Box>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Button
            component={Link}
            startIcon={<AutoAwesomeIcon />}
            to={`/packs/${setCode}`}
            variant="contained"
          >
            Open another pack
          </Button>
          <Button
            component={Link}
            startIcon={<StyleIcon />}
            to="/sets"
            variant="outlined"
          >
            Choose another set
          </Button>
          <Button
            component={Link}
            startIcon={<CollectionsBookmarkIcon />}
            to="/collection"
            variant="outlined"
          >
            View Collection
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function PackOpening() {
  const { setCode } = useParams();
  const { search, state } = useLocation();
  const { user } = useAuth();
  const { getEquippedItem } = useCosmetics();
  const isMobileReveal = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const normalizedSetCode = setCode?.trim().toLowerCase() || "";
  const boosterType = state?.boosterType === "collector" ? "collector" : "play";
  const boosterLabel =
    boosterType === "collector" ? "Collector Booster" : "Play Booster";
  const queryQuantity = new URLSearchParams(search).get("quantity");
  const packQuantity = normalizePackQuantity(state?.packQuantity ?? queryQuantity);
  const isBulkOpening = packQuantity === 10;
  const collectorBoosterTotalCost = COLLECTOR_BOOSTER_COST * packQuantity;
  const openingId =
    state?.openingId || `${normalizedSetCode}-${boosterType}-${packQuantity}-direct`;
  const [pack, setPack] = useState([]);
  const [bulkOpening, setBulkOpening] = useState(null);
  const [phase, setPhase] = useState(PHASES.cutPack);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(520);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savedMessageSeverity, setSavedMessageSeverity] = useState("success");
  const [saveResult, setSaveResult] = useState(null);
  const [isSavingOpening, setIsSavingOpening] = useState(false);
  const [openingSaved, setOpeningSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [completedOneOfOneRevealKey, setCompletedOneOfOneRevealKey] = useState("");
  const isAnimatingRef = useRef(false);
  const equippedOpeningScene = getEquippedItem("openingScene");
  const openingSceneId = equippedOpeningScene?.id;
  const equippedTearEffect = getEquippedItem("tearEffect");
  const tearEffectId = equippedTearEffect?.id;
  const equippedRevealEffect = getEquippedItem("revealEffect");
  const revealEffectId = equippedRevealEffect?.id;

  useEffect(() => {
    // Generate once per opening id; preview, reveal, summary, and saving all reuse this same pack.
    let isMounted = true;

    async function loadPack() {
      try {
        setIsLoading(true);
        setError("");
        setPhase(isBulkOpening ? PHASES.bulkOpening : PHASES.cutPack);
        setCurrentIndex(0);
        setBulkOpening(null);
        isAnimatingRef.current = false;
        setSavedMessage("");
        setSavedMessageSeverity("success");
        setSaveResult(null);
        setIsSavingOpening(false);
        setOpeningSaved(false);
        setSaveError("");
        setCompletedOneOfOneRevealKey("");

        if (isCollectorOnlySet(normalizedSetCode) && boosterType !== "collector") {
          // Direct URL protection: collector-only sets cannot bypass PackSelection.
          throw new Error(
            "This set is collector-only and cannot be opened as a Play Booster.",
          );
        }

        const collectorSpentKey = `collector-booster-spent-${openingId}-${packQuantity}`;
        const shouldSpendCollectorShards =
          boosterType === "collector" && !sessionStorage.getItem(collectorSpentKey);

        if (shouldSpendCollectorShards) {
          const currentShards = user ? await getCloudPackShards() : getPackShards();

          if (currentShards < collectorBoosterTotalCost) {
            throw new Error(
              `You need ${collectorBoosterTotalCost.toLocaleString()} Pack Shards to open ${packQuantity} Collector Booster${packQuantity === 1 ? "" : "s"}.`,
            );
          }
        }

        const generatedOpening = await generateMultipleBoosters({
          setCode: normalizedSetCode,
          boosterType,
          packQuantity,
        });

        if (shouldSpendCollectorShards) {
          if (user) {
            await spendCloudPackShards(collectorBoosterTotalCost);
          } else if (!spendPackShards(collectorBoosterTotalCost)) {
            throw new Error(
              `You need ${collectorBoosterTotalCost.toLocaleString()} Pack Shards to open ${packQuantity} Collector Booster${packQuantity === 1 ? "" : "s"}.`,
            );
          }

          sessionStorage.setItem(collectorSpentKey, "true");
        }

        if (isMounted) {
          setBulkOpening(generatedOpening);
          setPack(generatedOpening.allCards);
        }
      } catch (packError) {
        if (isMounted) {
          setError(packError.message || "Something went wrong while building this pack. Try again or choose another set.");
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
  }, [boosterType, collectorBoosterTotalCost, isBulkOpening, normalizedSetCode, openingId, packQuantity, user?.id]);

  const revealedPack = isBulkOpening ? bulkOpening?.allCards || pack : pack;
  const isFinished = currentIndex >= revealedPack.length;

  const skipToSummary = useCallback(() => {
    isAnimatingRef.current = false;
    setCurrentIndex(revealedPack.length);
    setPhase(isBulkOpening ? PHASES.bulkSummary : PHASES.summary);
  }, [isBulkOpening, revealedPack.length]);

  const advanceCard = useCallback(
    (direction = 1) => {
      // Swipe/click advances the index only; the generated pack array stays stable.
      if (isAnimatingRef.current) {
        return;
      }

      isAnimatingRef.current = true;
      setExitX(direction >= 0 ? 520 : -520);
      setCurrentIndex((previousIndex) => {
        const nextIndex = previousIndex + 1;

        if (nextIndex >= revealedPack.length) {
          setPhase(PHASES.summary);
          return revealedPack.length;
        }

        return nextIndex;
      });

      window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, 280);
    },
    [revealedPack.length],
  );

  useEffect(() => {
    if (phase === PHASES.summary) {
      isAnimatingRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (
      phase === PHASES.revealCards &&
      revealedPack.length > 0 &&
      currentIndex >= revealedPack.length
    ) {
      setPhase(PHASES.summary);
    }
  }, [phase, currentIndex, revealedPack.length]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        phase === PHASES.revealCards &&
        event.key === "ArrowRight" &&
        currentIndex < revealedPack.length
      ) {
        advanceCard();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [advanceCard, currentIndex, revealedPack.length, phase]);

  useEffect(() => {
    if (phase === PHASES.summary || phase === PHASES.bulkSummary) {
      isAnimatingRef.current = false;
    }
  }, [phase]);

  const saveRevealedPack = useCallback(async () => {
    if (isSavingOpening || openingSaved) {
      return;
    }

    const cardsToSave = isBulkOpening ? bulkOpening?.allCards || revealedPack : revealedPack;

    if (!cardsToSave.length) {
      const message = "No cards were available to save.";
      setSaveError(message);
      setSavedMessageSeverity("error");
      setSavedMessage(message);
      return;
    }

    try {
      setIsSavingOpening(true);
      setSaveError("");

      const nextSaveResult = user
        ? await saveOpenedCards(cardsToSave, {
            boosterType,
            setCode: normalizedSetCode,
            setName: state?.setName || cardsToSave[0]?.set_name,
            packQuantity,
          })
        : saveCardsToCollection(cardsToSave);
      setSaveResult(nextSaveResult);
      setOpeningSaved(true);
      window.dispatchEvent(new Event("packShardsUpdated"));

      const messages = [
        `Saved ${nextSaveResult.savedCards.length} cards to your collection.`,
      ];

      if (nextSaveResult.insertedCount !== nextSaveResult.attemptedCount) {
        messages.push(
          `Saved ${nextSaveResult.insertedCount} of ${nextSaveResult.attemptedCount} cards.`,
        );
      }

      if (nextSaveResult.shardsAwarded > 0) {
        messages.push(
          `${nextSaveResult.duplicateCount} duplicate ${nextSaveResult.duplicateCount === 1 ? "copy was" : "copies were"} converted into ${nextSaveResult.shardsAwarded} Pack Shards.`,
        );
      }

      setSavedMessageSeverity("success");
      setSavedMessage(`${messages.join(" ")} ${user ? "Saved to cloud collection." : "Saved locally."}`);
    } catch (error) {
      const message = error.message || "Cards could not be saved. Please try again.";
      setOpeningSaved(false);
      setSaveError(message);
      setSavedMessageSeverity("error");
      setSavedMessage("Cards could not be saved. Please try again.");
    } finally {
      setIsSavingOpening(false);
    }
  }, [
    boosterType,
    bulkOpening?.allCards,
    isBulkOpening,
    isSavingOpening,
    normalizedSetCode,
    openingSaved,
    packQuantity,
    revealedPack,
    state?.setName,
    user,
  ]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "grid",
          minHeight: "100dvh",
          placeItems: "center",
          bgcolor: "#03050d",
          px: 2,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="warning" sx={{ mb: 3 }} />
          <Typography color="text.secondary">
            Preparing your {boosterLabel}...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#03050d", px: 2, py: 4 }}>
        <Alert severity="error" sx={{ mx: "auto", maxWidth: 720 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (isBulkOpening && bulkOpening) {
    if (phase === PHASES.bulkOpening) {
      const fallbackArtwork =
        revealedPack.find((card) => card.rarity === "mythic")?.image ||
        revealedPack.find((card) => card.image)?.image;

      return (
        <BulkPackOpening
          boosterType={boosterType}
          packArt={state?.packArtwork || fallbackArtwork}
          packQuantity={packQuantity}
          setCode={normalizedSetCode}
          setIconUrl={state?.setIconUrl}
          setName={state?.setName || revealedPack[0]?.set_name || normalizedSetCode.toUpperCase()}
          onComplete={() => setPhase(PHASES.bulkHighlights)}
          onSkipToSummary={skipToSummary}
        />
      );
    }

    if (phase === PHASES.bulkHighlights) {
      return (
        <BulkPackHighlights
          allCards={bulkOpening.allCards}
          boosterType={boosterType}
          packs={bulkOpening.packs}
          onContinue={() => setPhase(PHASES.bulkSummary)}
        />
      );
    }

    if (phase === PHASES.bulkSummary) {
      return (
        <>
          <BulkPackSummary
            allCards={mergeSavedCardFlagsForDisplay(bulkOpening.allCards, saveResult?.savedCards)}
            boosterType={boosterType}
            isSaving={isSavingOpening}
            onSave={saveRevealedPack}
            packs={bulkOpening.packs}
            saveError={saveError}
            saved={openingSaved}
            saveResult={saveResult}
            sceneId={openingSceneId}
            setCode={normalizedSetCode}
            setName={state?.setName || revealedPack[0]?.set_name}
            totalShardCost={boosterType === "collector" ? collectorBoosterTotalCost : 0}
          />
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            autoHideDuration={4200}
            onClose={() => setSavedMessage("")}
            open={Boolean(savedMessage)}
          >
            <Alert
              severity={savedMessageSeverity}
              variant="filled"
              sx={{ width: "100%" }}
            >
              {savedMessage}
            </Alert>
          </Snackbar>
        </>
      );
    }
  }

  const shouldShowSummary =
    phase === PHASES.summary ||
    (phase === PHASES.revealCards && revealedPack.length > 0 && isFinished);

  if (shouldShowSummary) {
    return (
      <>
        <SummaryGrid
          boosterLabel={boosterLabel}
          isSaving={isSavingOpening}
          onSave={saveRevealedPack}
          pack={revealedPack}
          saveError={saveError}
          saved={openingSaved}
          saveResult={saveResult}
          sceneId={openingSceneId}
          setCode={normalizedSetCode}
        />
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          autoHideDuration={4200}
          onClose={() => setSavedMessage("")}
          open={Boolean(savedMessage)}
        >
          <Alert
            severity={savedMessageSeverity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {savedMessage}
          </Alert>
        </Snackbar>
      </>
    );
  }

  if (phase === PHASES.cutPack) {
    // The sealed pack art can come from route state, otherwise it falls back to a card in the pack.
    const fallbackArtwork =
      pack.find((card) => card.rarity === "mythic")?.image ||
      pack.find((card) => card.image)?.image;
    const packSetName =
      state?.setName || pack[0]?.set_name || normalizedSetCode.toUpperCase();

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
            boosterLabel={boosterLabel}
            boosterType={boosterType}
            sceneId={openingSceneId}
            setCode={normalizedSetCode}
            setIconUrl={state?.setIconUrl}
            setName={packSetName}
            tearEffectId={tearEffectId}
            onCutComplete={() => setPhase(PHASES.revealCards)}
            onSkipToSummary={skipToSummary}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (
    phase === PHASES.revealCards &&
    (revealedPack.length === 0 || isFinished)
  ) {
    return (
      <Box
        sx={{
          display: "grid",
          minHeight: "100vh",
          placeItems: "center",
          bgcolor: "#03050d",
          px: 2,
        }}
      >
        <CircularProgress color="warning" />
      </Box>
    );
  }

  const activeCard =
    phase === PHASES.revealCards ? revealedPack[currentIndex] : null;

  if (!activeCard) {
    return (
      <Box
        sx={{
          display: "grid",
          minHeight: "100vh",
          placeItems: "center",
          bgcolor: "#03050d",
          px: 2,
        }}
      >
        <CircularProgress color="warning" />
      </Box>
    );
  }

  const activeCardKey =
    activeCard.collectionTempId ||
    activeCard.id ||
    `${activeCard.name}-${currentIndex}`;
  const isFinalStretch = currentIndex >= revealedPack.length - 3;
  const activeCardIsOneOfOneRing = isOneOfOneRing(activeCard);
  // The special Ring animation wraps the actual active card from the pack sequence.
  const isOneOfOneAnimating =
    activeCardIsOneOfOneRing && completedOneOfOneRevealKey !== activeCardKey;

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        minHeight: "100dvh",
        overflow: "hidden",
        placeItems: "center",
        bgcolor: "#03050d",
        background:
          "radial-gradient(circle at 50% 42%, rgba(143, 124, 255, 0.2), transparent 28rem), radial-gradient(circle at 50% 100%, rgba(244, 201, 93, 0.12), transparent 30rem), #03050d",
        px: 2,
      }}
    >
      <OpeningSceneBackground phase="revealCards" sceneId={openingSceneId} />
      <Box
        sx={{
          position: "absolute",
          top: { xs: 14, sm: 20, md: 28 },
          left: 0,
          right: 0,
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <Typography color="text.secondary" fontWeight={800}>
          Opening {boosterLabel} · Card{" "}
          {Math.min(currentIndex + 1, revealedPack.length)} /{" "}
          {revealedPack.length}
        </Typography>
      </Box>

      {isOneOfOneAnimating ? (
        <OneOfOneRingReveal
          active
          card={activeCard}
          isMobile={isMobileReveal}
          onComplete={() => setCompletedOneOfOneRevealKey(activeCardKey)}
        />
      ) : activeCardIsOneOfOneRing ? (
        <>
          <OneOfOneRingAtmosphere active isMobile={isMobileReveal} settled />
          <InspectableFoilCard
            canInspect
            card={activeCard}
            className="reveal-special-pulse oneOfOneCardFrame"
            onSwipeAway={advanceCard}
            swipeAwayThreshold={120}
            sx={{
              position: "relative",
              width: REVEAL_CARD_WIDTH,
              maxWidth: 440,
              boxShadow:
                "0 0 82px rgba(244, 201, 93, 0.54), 0 0 150px rgba(255, 179, 36, 0.36), 0 32px 90px rgba(0, 0, 0, 0.68)",
            }}
            variant="reveal"
          />
          <Box
            sx={{
              position: "absolute",
              bottom: { xs: 76, sm: 92, md: 78 },
              left: 0,
              right: 0,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <Chip color="warning" label="1 of 1" size="small" sx={{ mr: 1, mt: 1, fontWeight: 900 }} />
            <Chip color="warning" label="Collector Booster Exclusive" size="small" sx={{ mt: 1, fontWeight: 900 }} variant="outlined" />
            <Typography color="text.secondary" sx={{ mt: 1, fontSize: 13, fontWeight: 800 }}>
              Drag gently to inspect the ringlight.
            </Typography>
          </Box>
        </>
      ) : (
        <Fade in timeout={260} key={`fade-${activeCardKey}-${currentIndex}`}>
          <Box sx={{ position: "relative", zIndex: 2 }}>
            <Zoom in timeout={260}>
              <Box>
                <RevealCard
                  card={activeCard}
                  cardNumber={currentIndex + 1}
                  exitX={exitX}
                  onAdvance={advanceCard}
                  revealEffectId={revealEffectId}
                />
              </Box>
            </Zoom>
          </Box>
        </Fade>
      )}

      {isFinalStretch && (
        <Typography
          color="warning.main"
          fontWeight={900}
          sx={{
            position: "absolute",
            top: { xs: 42, sm: 52, md: 62 },
            zIndex: 2,
            textAlign: "center",
          }}
        >
          Final reveal
        </Typography>
      )}

      <Box
        sx={{
          bottom: { xs: 16, sm: 24, md: 32 },
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          justifyContent: "center",
          position: "absolute",
          zIndex: 2,
        }}
      >
        <Button
          endIcon={<KeyboardArrowRightIcon />}
          onClick={advanceCard}
          variant="contained"
        >
          Next
        </Button>
        <Button
          endIcon={<KeyboardArrowRightIcon />}
          onClick={skipToSummary}
          variant="outlined"
        >
          Skip to Summary
        </Button>
      </Box>
    </Box>
  );
}
