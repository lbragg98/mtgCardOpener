import { Box, useMediaQuery } from "@mui/material";

const DEFAULT_SCENE = {
  aura:
    "radial-gradient(circle at 50% 40%, rgba(143, 124, 255, 0.18), transparent 32rem)",
  base:
    "radial-gradient(circle at 50% 100%, rgba(244, 201, 93, 0.12), transparent 30rem), #03050d",
  className: "mysticTabletop",
  fog: "rgba(143, 124, 255, 0.24)",
  line: "rgba(244, 201, 93, 0.2)",
  particle: "rgba(244, 201, 93, 0.55)",
  secondaryParticle: "rgba(76, 201, 240, 0.42)",
};

const SCENES = {
  "scene-mystic-tabletop": {
    ...DEFAULT_SCENE,
    aura:
      "radial-gradient(circle at 50% 38%, rgba(120, 94, 240, 0.24), transparent 30rem)",
    base:
      "radial-gradient(circle at 18% 84%, rgba(244, 201, 93, 0.12), transparent 24rem), linear-gradient(180deg, #0b0a16, #03050d 62%, #080711)",
    className: "mysticTabletop",
  },
  "scene-ancient-library": {
    aura:
      "radial-gradient(circle at 28% 28%, rgba(231, 193, 109, 0.18), transparent 26rem)",
    base:
      "radial-gradient(circle at 74% 18%, rgba(143, 82, 34, 0.13), transparent 22rem), linear-gradient(180deg, #100d0a, #050403 62%, #0d0805)",
    className: "ancientLibrary",
    fog: "rgba(231, 193, 109, 0.18)",
    line: "rgba(143, 106, 62, 0.22)",
    particle: "rgba(231, 193, 109, 0.54)",
    secondaryParticle: "rgba(255, 152, 78, 0.28)",
  },
  "scene-cosmic-void": {
    aura:
      "radial-gradient(circle at 54% 42%, rgba(53, 100, 255, 0.2), transparent 28rem)",
    base:
      "radial-gradient(circle at 78% 28%, rgba(192, 105, 255, 0.16), transparent 24rem), linear-gradient(180deg, #02030c, #030616 54%, #010208)",
    className: "cosmicVoid",
    fog: "rgba(53, 100, 255, 0.18)",
    line: "rgba(192, 105, 255, 0.22)",
    particle: "rgba(160, 190, 255, 0.72)",
    secondaryParticle: "rgba(192, 105, 255, 0.48)",
  },
  "scene-treasure-vault": {
    aura:
      "radial-gradient(circle at 50% 58%, rgba(214, 163, 58, 0.22), transparent 30rem)",
    base:
      "radial-gradient(circle at 24% 82%, rgba(255, 241, 168, 0.12), transparent 24rem), linear-gradient(180deg, #080806, #050403 58%, #100b04)",
    className: "treasureVault",
    fog: "rgba(214, 163, 58, 0.2)",
    line: "rgba(255, 241, 168, 0.2)",
    particle: "rgba(255, 215, 100, 0.58)",
    secondaryParticle: "rgba(214, 134, 38, 0.34)",
  },
  "scene-moonlit-temple": {
    aura:
      "radial-gradient(circle at 50% 20%, rgba(247, 248, 255, 0.16), transparent 30rem)",
    base:
      "radial-gradient(circle at 72% 72%, rgba(143, 168, 200, 0.13), transparent 26rem), linear-gradient(180deg, #101622, #050912 60%, #0a1018)",
    className: "moonlitTemple",
    fog: "rgba(180, 204, 235, 0.2)",
    line: "rgba(247, 248, 255, 0.18)",
    particle: "rgba(247, 248, 255, 0.62)",
    secondaryParticle: "rgba(143, 168, 200, 0.42)",
  },
  "scene-neon-rift": {
    aura:
      "radial-gradient(circle at 46% 44%, rgba(0, 240, 255, 0.2), transparent 26rem)",
    base:
      "radial-gradient(circle at 68% 40%, rgba(255, 0, 191, 0.18), transparent 24rem), linear-gradient(180deg, #020308, #050510 56%, #020309)",
    className: "neonRift",
    fog: "rgba(0, 240, 255, 0.16)",
    line: "rgba(255, 0, 191, 0.28)",
    particle: "rgba(0, 240, 255, 0.72)",
    secondaryParticle: "rgba(255, 0, 191, 0.58)",
  },
  "scene-dragons-hoard": {
    aura:
      "radial-gradient(circle at 50% 64%, rgba(255, 186, 74, 0.2), transparent 30rem)",
    base:
      "radial-gradient(circle at 26% 30%, rgba(184, 36, 24, 0.18), transparent 24rem), linear-gradient(180deg, #130604, #070302 56%, #180905)",
    className: "dragonsHoard",
    fog: "rgba(255, 96, 40, 0.17)",
    line: "rgba(255, 186, 74, 0.2)",
    particle: "rgba(255, 154, 64, 0.62)",
    secondaryParticle: "rgba(184, 36, 24, 0.44)",
  },
  "scene-eldritch-gate": {
    aura:
      "radial-gradient(circle at 50% 42%, rgba(36, 201, 109, 0.2), transparent 28rem)",
    base:
      "radial-gradient(circle at 72% 72%, rgba(184, 255, 207, 0.1), transparent 24rem), linear-gradient(180deg, #031008, #030704 58%, #06140b)",
    className: "eldritchGate",
    fog: "rgba(36, 201, 109, 0.18)",
    line: "rgba(184, 255, 207, 0.18)",
    particle: "rgba(80, 255, 150, 0.6)",
    secondaryParticle: "rgba(184, 255, 207, 0.34)",
  },
};

const PHASE_INTENSITY = {
  cutPack: 0.86,
  tearing: 1,
  stackPreview: 0.92,
  revealCards: 1,
  summary: 0.72,
};

export default function OpeningSceneBackground({ phase = "revealCards", sceneId }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const scene = SCENES[sceneId] || DEFAULT_SCENE;
  const particleCount = isMobile ? 8 : 18;

  return (
    <Box
      aria-hidden="true"
      className={`openingSceneBackground openingScene-${scene.className} openingScenePhase-${phase}`}
      sx={{
        "--opening-scene-aura": scene.aura,
        "--opening-scene-base": scene.base,
        "--opening-scene-fog": scene.fog,
        "--opening-scene-intensity": PHASE_INTENSITY[phase] || 0.88,
        "--opening-scene-line": scene.line,
        "--opening-scene-particle": scene.particle,
        "--opening-scene-secondary-particle": scene.secondaryParticle,
      }}
    >
      <Box className="openingSceneFog" />
      <Box className="openingSceneLines" />
      <Box className="openingSceneParticles">
        {Array.from({ length: particleCount }).map((_, index) => (
          <Box
            className="openingSceneParticle"
            key={index}
            sx={{
              "--particle-delay": `${index * -0.7}s`,
              "--particle-left": `${8 + ((index * 19) % 84)}%`,
              "--particle-size": `${2 + (index % 4)}px`,
              "--particle-speed": `${7 + (index % 6)}s`,
              "--particle-top": `${10 + ((index * 23) % 82)}%`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
