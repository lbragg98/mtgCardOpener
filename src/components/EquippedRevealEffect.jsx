// Equipped reveal effects add flair to eligible non-foil rare/mythic cards only.
import { Box } from "@mui/material";

const DEFAULT_EFFECT = {
  aura:
    "radial-gradient(circle, rgba(244,201,93,0.3), rgba(220,226,238,0.12) 42%, transparent 72%)",
  className: "classic",
  glow: "rgba(244, 201, 93, 0.55)",
  particle: "rgba(255, 236, 170, 0.82)",
  ring: "rgba(244, 201, 93, 0.74)",
};

const EFFECTS = {
  "reveal-classic": DEFAULT_EFFECT,
  "reveal-arcane-burst": {
    aura:
      "radial-gradient(circle, rgba(143,124,255,0.34), rgba(244,201,93,0.16) 42%, transparent 74%)",
    className: "arcaneBurst",
    glow: "rgba(143, 124, 255, 0.58)",
    particle: "rgba(244, 201, 93, 0.82)",
    ring: "rgba(180, 160, 255, 0.76)",
  },
  "reveal-gold-flash": {
    aura:
      "radial-gradient(circle, rgba(255,240,184,0.36), rgba(201,150,46,0.18) 42%, transparent 74%)",
    className: "goldFlash",
    glow: "rgba(255, 210, 98, 0.62)",
    particle: "rgba(255, 240, 184, 0.88)",
    ring: "rgba(255, 214, 112, 0.82)",
  },
  "reveal-cosmic-pull": {
    aura:
      "radial-gradient(circle, rgba(53,100,255,0.34), rgba(192,105,255,0.2) 44%, transparent 76%)",
    className: "cosmicPull",
    glow: "rgba(53, 100, 255, 0.58)",
    particle: "rgba(205, 220, 255, 0.86)",
    ring: "rgba(192, 105, 255, 0.78)",
  },
  "reveal-fire-impact": {
    aura:
      "radial-gradient(circle, rgba(255,186,74,0.34), rgba(184,36,24,0.22) 44%, transparent 76%)",
    className: "fireImpact",
    glow: "rgba(255, 96, 40, 0.6)",
    particle: "rgba(255, 186, 74, 0.86)",
    ring: "rgba(255, 120, 48, 0.78)",
  },
  "reveal-neon-pulse": {
    aura:
      "radial-gradient(circle, rgba(0,245,255,0.3), rgba(255,0,200,0.22) 44%, transparent 76%)",
    className: "neonPulse",
    glow: "rgba(0, 245, 255, 0.62)",
    particle: "rgba(255, 0, 200, 0.78)",
    ring: "rgba(0, 245, 255, 0.82)",
  },
  "reveal-moonlight": {
    aura:
      "radial-gradient(circle, rgba(247,249,255,0.32), rgba(143,168,200,0.18) 46%, transparent 76%)",
    className: "moonlight",
    glow: "rgba(180, 205, 235, 0.52)",
    particle: "rgba(247, 249, 255, 0.82)",
    ring: "rgba(210, 226, 248, 0.74)",
  },
  "reveal-vault-unlock": {
    aura:
      "radial-gradient(circle, rgba(255,241,168,0.34), rgba(214,163,58,0.2) 44%, transparent 76%)",
    className: "vaultUnlock",
    glow: "rgba(214, 163, 58, 0.6)",
    particle: "rgba(255, 241, 168, 0.86)",
    ring: "rgba(255, 218, 116, 0.8)",
  },
};

export default function EquippedRevealEffect({ active = false, card, revealEffectId }) {
  if (!active || !card) {
    return null;
  }

  const effect = EFFECTS[revealEffectId] || DEFAULT_EFFECT;

  return (
    <Box
      aria-hidden="true"
      className={`equippedRevealEffect equippedRevealEffect-${effect.className}`}
      sx={{
        "--reveal-effect-aura": effect.aura,
        "--reveal-effect-glow": effect.glow,
        "--reveal-effect-particle": effect.particle,
        "--reveal-effect-ring": effect.ring,
      }}
    >
      <Box className="equippedRevealEffectAura" />
      <Box className="equippedRevealEffectRing" />
      <Box className="equippedRevealEffectParticles">
        {Array.from({ length: 10 }).map((_, index) => (
          <Box
            className="equippedRevealEffectParticle"
            key={index}
            sx={{
              "--reveal-particle-delay": `${index * 42}ms`,
              "--reveal-particle-left": `${12 + ((index * 17) % 76)}%`,
              "--reveal-particle-top": `${16 + ((index * 23) % 68)}%`,
              "--reveal-particle-x": `${index % 2 === 0 ? -18 : 18}px`,
              "--reveal-particle-y": `${index % 3 === 0 ? -28 : 22}px`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
