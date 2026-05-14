// Pack tear effects are visual-only overlays for the cut/open animation.
import { Box } from "@mui/material";

const DEFAULT_EFFECT = {
  accent: "rgba(255, 255, 255, 0.95)",
  burst:
    "radial-gradient(circle, rgba(244,201,93,0.72), rgba(143,124,255,0.24) 45%, transparent 70%)",
  className: "clean",
  glow: "rgba(244, 201, 93, 0.72)",
  particle: "rgba(255, 255, 255, 0.78)",
  seam:
    "linear-gradient(90deg, transparent, rgba(255,255,255,0.88), rgba(244,201,93,0.9), transparent)",
};

const EFFECTS = {
  "tear-clean": DEFAULT_EFFECT,
  "tear-arcane-slice": {
    accent: "#c9b8ff",
    burst:
      "radial-gradient(circle, rgba(201,184,255,0.76), rgba(143,124,255,0.38) 42%, transparent 72%)",
    className: "arcaneSlice",
    glow: "rgba(143, 124, 255, 0.82)",
    particle: "rgba(244, 201, 93, 0.74)",
    seam:
      "linear-gradient(90deg, transparent, rgba(143,124,255,0.95), rgba(244,201,93,0.9), transparent)",
  },
  "tear-lightning-rip": {
    accent: "#fff6a3",
    burst:
      "radial-gradient(circle, rgba(255,246,163,0.82), rgba(76,201,240,0.42) 38%, transparent 72%)",
    className: "lightningRip",
    glow: "rgba(76, 201, 240, 0.88)",
    particle: "rgba(255, 246, 163, 0.82)",
    seam:
      "linear-gradient(90deg, transparent, rgba(76,201,240,0.94), rgba(255,246,163,0.95), transparent)",
  },
  "tear-golden-seal-break": {
    accent: "#fff0b8",
    burst:
      "radial-gradient(circle, rgba(255,240,184,0.84), rgba(201,150,46,0.48) 42%, transparent 72%)",
    className: "goldenSealBreak",
    glow: "rgba(255, 210, 98, 0.86)",
    particle: "rgba(255, 240, 184, 0.86)",
    seam:
      "linear-gradient(90deg, transparent, rgba(201,150,46,0.96), rgba(255,240,184,0.95), transparent)",
  },
  "tear-galaxy-rift": {
    accent: "#c069ff",
    burst:
      "radial-gradient(circle, rgba(192,105,255,0.7), rgba(53,100,255,0.48) 38%, transparent 74%)",
    className: "galaxyRift",
    glow: "rgba(53, 100, 255, 0.84)",
    particle: "rgba(200, 220, 255, 0.86)",
    seam:
      "linear-gradient(90deg, transparent, rgba(53,100,255,0.94), rgba(192,105,255,0.95), transparent)",
  },
  "tear-neon-cutter": {
    accent: "#00f5ff",
    burst:
      "radial-gradient(circle, rgba(0,245,255,0.72), rgba(255,0,200,0.42) 42%, transparent 72%)",
    className: "neonCutter",
    glow: "rgba(0, 245, 255, 0.88)",
    particle: "rgba(255, 0, 200, 0.78)",
    seam:
      "linear-gradient(90deg, transparent, rgba(0,245,255,0.96), rgba(255,0,200,0.92), transparent)",
  },
  "tear-dragonfire-burn": {
    accent: "#ffba4a",
    burst:
      "radial-gradient(circle, rgba(255,186,74,0.82), rgba(184,36,24,0.5) 42%, transparent 74%)",
    className: "dragonfireBurn",
    glow: "rgba(255, 96, 40, 0.86)",
    particle: "rgba(255, 186, 74, 0.82)",
    seam:
      "linear-gradient(90deg, transparent, rgba(184,36,24,0.92), rgba(255,186,74,0.95), transparent)",
  },
  "tear-eldritch-unseal": {
    accent: "#b8ffcf",
    burst:
      "radial-gradient(circle, rgba(184,255,207,0.78), rgba(36,201,109,0.48) 42%, transparent 74%)",
    className: "eldritchUnseal",
    glow: "rgba(36, 201, 109, 0.84)",
    particle: "rgba(184, 255, 207, 0.82)",
    seam:
      "linear-gradient(90deg, transparent, rgba(36,201,109,0.96), rgba(184,255,207,0.92), transparent)",
  },
};

export default function TearEffect({
  boosterType = "play",
  isTearing = false,
  tearEffectId,
  tearProgress = 0,
}) {
  const effect = EFFECTS[tearEffectId] || DEFAULT_EFFECT;
  const particleCount = boosterType === "collector" ? 10 : 7;

  return (
    <Box
      aria-hidden="true"
      className={[
        "tearEffect",
        `tearEffect-${effect.className}`,
        isTearing ? "tearEffect-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      sx={{
        "--tear-accent": effect.accent,
        "--tear-burst": effect.burst,
        "--tear-glow": effect.glow,
        "--tear-particle": effect.particle,
        "--tear-progress": tearProgress,
        "--tear-seam": effect.seam,
      }}
    >
      <Box className="tearEffectSeam" />
      <Box className="tearEffectBlade" />
      <Box className="tearEffectBurst" />
      <Box className="tearEffectParticles">
        {Array.from({ length: particleCount }).map((_, index) => (
          <Box
            className="tearEffectParticle"
            key={index}
            sx={{
              "--tear-particle-delay": `${index * 36}ms`,
              "--tear-particle-left": `${12 + index * (76 / Math.max(particleCount - 1, 1))}%`,
              "--tear-particle-size": `${2 + (index % 3)}px`,
              "--tear-particle-y": `${index % 2 === 0 ? -22 : 24}px`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
