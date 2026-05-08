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
import FoilImpactScene from "../components/FoilImpactScene.jsx";
import InspectableFoilCard from "../components/InspectableFoilCard.jsx";
import MobileFoilRevealCard from "../components/MobileFoilRevealCard.jsx";
import SealedPack from "../components/SealedPack.jsx";
import {
  getPackShards,
  saveCardsToCollection,
  spendPackShards,
} from "../utils/collectionStorage.js";
import {
  FOIL_LABELS,
  FOIL_TREATMENTS,
  normalizeFoilTreatment,
} from "../utils/foilTypes.js";
import {
  generateCollectorBooster,
  generatePlayBooster,
} from "../utils/packGenerator.js";

const SWIPE_THRESHOLD = 120;
const CUT_THRESHOLD = 170;
const COLLECTOR_BOOSTER_COST = 1000;
const REVEAL_CARD_WIDTH = { xs: "min(76vw, 42vh)", sm: 360, md: 420 };
const FOIL_REVEAL_TRANSITION = {
  duration: 1.05,
  times: [0, 0.48, 0.66, 0.82, 1],
  ease: [0.16, 1, 0.3, 1],
};
const PHASES = {
  cutPack: "cutPack",
  revealCards: "revealCards",
  summary: "summary",
};

function getFoilRevealConfig(card) {
  const foilTreatment = normalizeFoilTreatment(card);
  const configs = {
    [FOIL_TREATMENTS.RAINBOW]: {
      intensity: 1,
      auraClassName: "foilRevealAura foilRevealAura-rainbow",
      impactClassName: "impactRainbow",
      screenShake: false,
      transition: FOIL_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.ETCHED]: {
      intensity: 2,
      auraClassName: "foilRevealAura foilRevealAura-etched",
      impactClassName: "impactEtched",
      screenShake: false,
      transition: FOIL_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.GALAXY]: {
      intensity: 3,
      auraClassName: "foilRevealAura foilRevealAura-galaxy",
      impactClassName: "impactGalaxy",
      screenShake: true,
      transition: FOIL_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.GILDED]: {
      intensity: 3,
      auraClassName: "foilRevealAura foilRevealAura-gilded",
      impactClassName: "impactGilded",
      screenShake: true,
      transition: FOIL_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.TEXTURED]: {
      intensity: 5,
      auraClassName: "foilRevealAura foilRevealAura-textured",
      impactClassName: "impactTextured",
      screenShake: true,
      transition: FOIL_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.NEON_INK]: {
      intensity: 6,
      auraClassName: "foilRevealAura foilRevealAura-neonInk",
      impactClassName: "impactNeonInk",
      screenShake: true,
      transition: FOIL_REVEAL_TRANSITION,
    },
  };

  return (
    configs[foilTreatment] || {
      intensity: card?.isFoil ? 1 : 0,
      auraClassName: card?.isFoil
        ? "foilRevealAura foilRevealAura-rainbow"
        : "",
      impactClassName: card?.isFoil ? "impactRainbow" : "",
      screenShake: false,
      transition: card?.isFoil
        ? FOIL_REVEAL_TRANSITION
        : { duration: 0.26, ease: "easeOut" },
    }
  );
}

function PackCuttingScreen({
  artwork,
  boosterLabel,
  setCode,
  setIconUrl,
  setName,
  onCutComplete,
}) {
  const cutterControls = useAnimation();
  const cutterTrackRef = useRef(null);
  const [isCut, setIsCut] = useState(false);

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
      window.setTimeout(onCutComplete, 900);
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
          "radial-gradient(circle at 50% 36%, rgba(76, 201, 240, 0.18), transparent 28rem), radial-gradient(circle at 50% 90%, rgba(244, 201, 93, 0.12), transparent 30rem), #03050d",
        px: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: { xs: 24, md: 34 },
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Typography color="warning.main" fontWeight={900}>
          {setCode.toUpperCase()} {boosterLabel}
        </Typography>
        <Typography color="text.secondary">
          Swipe across the top seal to open
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          width: { xs: "76vw", sm: 320 },
          maxWidth: 340,
          height: { xs: 500, sm: 520 },
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
    </Box>
  );
}

function RevealCard({ card, cardNumber, exitX, onAdvance }) {
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
  const foilRevealConfig = getFoilRevealConfig(card);
  const isFoilReveal = Boolean(card.isFoil);
  const mobileFoilRevealTransition = {
    duration: 0.75,
    times: [0, 0.52, 0.76, 1],
    ease: [0.16, 1, 0.3, 1],
  };
  const revealInitial = isFoilReveal
    ? isMobile
      ? {
          opacity: 0,
          rotateY: 55,
          rotateX: -8,
          scale: 0.82,
          transformPerspective: 1000,
          y: -80,
        }
      : {
          opacity: 0,
          rotateY: 92,
          rotateX: -18,
          scale: 0.66,
          transformPerspective: 1000,
          y: -160,
        }
    : { opacity: 0, y: 20, scale: 0.96 };
  const revealAnimate = isFoilReveal
    ? isMobile
      ? {
          opacity: 1,
          rotateY: [55, 10, 0],
          rotateX: [-8, 4, 0],
          scale: [0.82, 1.08, 0.96, 1],
          transformPerspective: 1000,
          y: [-80, 14, -4, 0],
        }
      : {
          opacity: [0, 1, 1, 1, 1],
          rotateY: [92, 28, -4, 0, 0],
          rotateX: [-18, 10, -2, 0, 0],
          scale: [0.66, 1.22, 0.86, 1.08, 1],
          transformPerspective: 1000,
          y: [-160, 32, -18, 6, 0],
        }
    : { opacity: 1, y: 0, scale: 1 };
  const revealTransition = isFoilReveal
    ? isMobile
      ? mobileFoilRevealTransition
      : foilRevealConfig.transition
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
            isFoilReveal
              ? `foilRevealSlam foilRevealIntensity-${foilRevealConfig.intensity}`
              : "",
            foilRevealConfig.screenShake && !isMobile
              ? "foilRevealScreenShake"
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
              <Box className={foilRevealConfig.auraClassName} />
              <FoilImpactScene
                active={foilImpactBoom}
                card={card}
                intensity={foilRevealConfig.intensity}
              />
            </>
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
        {isFoilReveal && canInspectFoil && (
          <Typography
            color="text.secondary"
            sx={{ mt: 1, fontSize: 13, fontWeight: 800 }}
          >
            Drag to inspect the foil shine
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

function SummaryGrid({ boosterLabel, pack, saveResult, setCode }) {
  return (
    <Box
      sx={{ minHeight: "100vh", px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}
    >
      <Box sx={{ mx: "auto", maxWidth: 920 }}>
        <Typography color="warning.main" fontWeight={900} gutterBottom>
          {setCode.toUpperCase()} {boosterLabel} opened
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{ mb: 3, fontSize: { xs: 32, md: 40 } }}
        >
          Pack Summary
        </Typography>

        {saveResult && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(5, minmax(0, 1fr))",
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
          {pack.map((card) => (
            <Card
              key={`${card.id}-${card.packSlot}`}
              sx={{ position: "relative", overflow: "hidden", minWidth: 0 }}
            >
              <CardImage card={card} variant="grid" />
              <CardContent sx={{ p: 1 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                  {card.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.rarity}
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
              </CardContent>
            </Card>
          ))}
        </Box>

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
  const { state } = useLocation();
  const normalizedSetCode = setCode?.trim().toLowerCase() || "";
  const boosterType = state?.boosterType === "collector" ? "collector" : "play";
  const boosterLabel =
    boosterType === "collector" ? "Collector Booster" : "Play Booster";
  const openingId =
    state?.openingId || `${normalizedSetCode}-${boosterType}-direct`;
  const [pack, setPack] = useState([]);
  const [phase, setPhase] = useState(PHASES.cutPack);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(520);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [savedMessageSeverity, setSavedMessageSeverity] = useState("success");
  const [saveResult, setSaveResult] = useState(null);
  const hasSavedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPack() {
      try {
        setIsLoading(true);
        setError("");
        setPhase(PHASES.cutPack);
        setCurrentIndex(0);
        hasSavedRef.current = false;
        isAnimatingRef.current = false;
        setSavedMessage("");
        setSavedMessageSeverity("success");
        setSaveResult(null);
        const generatedPack =
          boosterType === "collector"
            ? await generateCollectorBooster(normalizedSetCode)
            : await generatePlayBooster(normalizedSetCode);

        if (boosterType === "collector") {
          const spentKey = `collector-booster-spent-${openingId}`;

          if (!sessionStorage.getItem(spentKey)) {
            if (
              getPackShards() < COLLECTOR_BOOSTER_COST ||
              !spendPackShards(COLLECTOR_BOOSTER_COST)
            ) {
              throw new Error(
                "You need 1,000 pack shards to open a Collector Booster.",
              );
            }

            sessionStorage.setItem(spentKey, "true");
          }
        }

        if (isMounted) {
          setPack(generatedPack);
        }
      } catch (packError) {
        if (isMounted) {
          setError(packError.message || "Unable to generate this pack.");
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
  }, [boosterType, normalizedSetCode, openingId]);

  const revealedPack = pack;
  const isFinished = currentIndex >= revealedPack.length;

  const advanceCard = useCallback(
    (direction = 1) => {
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
    if (
      phase === PHASES.summary &&
      revealedPack.length > 0 &&
      !hasSavedRef.current
    ) {
      hasSavedRef.current = true;

      try {
        const saveResult = saveCardsToCollection(revealedPack);
        setSaveResult(saveResult);
        window.dispatchEvent(new Event("packShardsUpdated"));

        const messages = [
          `${saveResult.savedCards.length} cards added to your collection.`,
        ];

        if (saveResult.shardsAwarded > 0) {
          messages.push(
            `${saveResult.duplicateCount} duplicates converted into ${saveResult.shardsAwarded} pack shards.`,
          );
        }

        setSavedMessageSeverity("success");
        setSavedMessage(messages.join(" "));
      } catch {
        setSavedMessageSeverity("error");
        setSavedMessage(
          "Pack summary is ready, but the collection could not be saved.",
        );
      }
    }
  }, [revealedPack, phase]);

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
            Generating {boosterLabel}...
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

  const shouldShowSummary =
    phase === PHASES.summary ||
    (phase === PHASES.revealCards && revealedPack.length > 0 && isFinished);

  if (shouldShowSummary) {
    return (
      <>
        <SummaryGrid
          boosterLabel={boosterLabel}
          pack={revealedPack}
          saveResult={saveResult}
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
            setCode={normalizedSetCode}
            setIconUrl={state?.setIconUrl}
            setName={packSetName}
            onCutComplete={() => setPhase(PHASES.revealCards)}
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
      <Box
        sx={{
          position: "absolute",
          top: { xs: 14, sm: 20, md: 28 },
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <Typography color="text.secondary" fontWeight={800}>
          Opening {boosterLabel} · Card{" "}
          {Math.min(currentIndex + 1, revealedPack.length)} /{" "}
          {revealedPack.length}
        </Typography>
      </Box>

      <Fade in timeout={260} key={`fade-${activeCardKey}-${currentIndex}`}>
        <Box sx={{ position: "relative" }}>
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
          sx={{
            position: "absolute",
            top: { xs: 42, sm: 52, md: 62 },
            textAlign: "center",
          }}
        >
          Final reveal
        </Typography>
      )}

      <Button
        endIcon={<KeyboardArrowRightIcon />}
        onClick={advanceCard}
        variant="contained"
        sx={{ position: "absolute", bottom: { xs: 16, sm: 24, md: 32 } }}
      >
        Next
      </Button>
    </Box>
  );
}
