import { FOIL_LABELS, FOIL_TREATMENTS, normalizeFoilTreatment } from './foilTypes.js';

const FOIL_ANIMATION_CONFIGS = {
  [FOIL_TREATMENTS.RAINBOW]: {
    treatment: FOIL_TREATMENTS.RAINBOW,
    label: FOIL_LABELS[FOIL_TREATMENTS.RAINBOW],
    impactClass: 'impactRainbow',
    ambientClass: 'ambientRainbow',
    revealClass: 'revealRainbow',
    intensity: 1,
    colors: {
      primary: 'rgba(255, 236, 92, 0.9)',
      secondary: 'rgba(76, 220, 255, 0.62)',
      accent: 'rgba(255, 65, 216, 0.48)',
    },
    mobileSafe: true,
  },
  [FOIL_TREATMENTS.ETCHED]: {
    treatment: FOIL_TREATMENTS.ETCHED,
    label: FOIL_LABELS[FOIL_TREATMENTS.ETCHED],
    impactClass: 'impactEtched',
    ambientClass: 'ambientEtched',
    revealClass: 'revealEtched',
    intensity: 2,
    colors: {
      primary: 'rgba(245, 241, 222, 0.88)',
      secondary: 'rgba(244, 201, 93, 0.5)',
      accent: 'rgba(210, 220, 235, 0.52)',
    },
    mobileSafe: true,
  },
  [FOIL_TREATMENTS.GALAXY]: {
    treatment: FOIL_TREATMENTS.GALAXY,
    label: FOIL_LABELS[FOIL_TREATMENTS.GALAXY],
    impactClass: 'impactGalaxy',
    ambientClass: 'ambientGalaxy',
    revealClass: 'revealGalaxy',
    intensity: 3,
    colors: {
      primary: 'rgba(110, 150, 255, 0.95)',
      secondary: 'rgba(190, 80, 255, 0.7)',
      accent: 'rgba(0, 220, 255, 0.65)',
    },
    mobileSafe: true,
  },
  [FOIL_TREATMENTS.GILDED]: {
    treatment: FOIL_TREATMENTS.GILDED,
    label: FOIL_LABELS[FOIL_TREATMENTS.GILDED],
    impactClass: 'impactGilded',
    ambientClass: 'ambientGilded',
    revealClass: 'revealGilded',
    intensity: 3,
    colors: {
      primary: 'rgba(255, 218, 105, 0.94)',
      secondary: 'rgba(255, 159, 52, 0.62)',
      accent: 'rgba(255, 245, 180, 0.72)',
    },
    mobileSafe: true,
  },
  [FOIL_TREATMENTS.TEXTURED]: {
    treatment: FOIL_TREATMENTS.TEXTURED,
    label: FOIL_LABELS[FOIL_TREATMENTS.TEXTURED],
    impactClass: 'impactTextured',
    ambientClass: 'ambientTextured',
    revealClass: 'revealTextured',
    intensity: 4,
    colors: {
      primary: 'rgba(255, 255, 255, 0.9)',
      secondary: 'rgba(143, 124, 255, 0.62)',
      accent: 'rgba(244, 201, 93, 0.5)',
    },
    mobileSafe: true,
  },
  [FOIL_TREATMENTS.NEON_INK]: {
    treatment: FOIL_TREATMENTS.NEON_INK,
    label: FOIL_LABELS[FOIL_TREATMENTS.NEON_INK],
    impactClass: 'impactNeonInk',
    ambientClass: 'ambientNeonInk',
    revealClass: 'revealNeonInk',
    intensity: 4,
    colors: {
      primary: 'rgba(0, 255, 255, 0.94)',
      secondary: 'rgba(255, 0, 200, 0.68)',
      accent: 'rgba(173, 255, 47, 0.42)',
    },
    mobileSafe: true,
  },
};

const DEFAULT_REVEAL_TRANSITION = {
  duration: 1.05,
  times: [0, 0.48, 0.66, 0.82, 1],
  ease: [0.16, 1, 0.3, 1],
};

export function getFoilAnimationConfig(card) {
  const treatment = normalizeFoilTreatment(card);

  return FOIL_ANIMATION_CONFIGS[treatment] || FOIL_ANIMATION_CONFIGS[FOIL_TREATMENTS.RAINBOW];
}

export function getFoilRevealMotion(card, isMobile = false) {
  const { treatment } = getFoilAnimationConfig(card);

  if (isMobile) {
    return {
      initial: {
        opacity: 0,
        y: 70,
        scale: 0.84,
        rotateZ: treatment === FOIL_TREATMENTS.NEON_INK ? 0 : -2,
      },
      animate: {
        opacity: 1,
        y: [70, -8, 4, 0],
        scale: [0.84, 1.07, 0.98, 1],
        rotateZ: treatment === FOIL_TREATMENTS.NEON_INK ? [0, -1, 1, 0] : [-2, 1, 0],
      },
      transition: {
        duration: 0.65,
        times: [0, 0.5, 0.78, 1],
        ease: 'easeOut',
      },
    };
  }

  const desktopMotions = {
    [FOIL_TREATMENTS.RAINBOW]: {
      initial: { opacity: 0, rotateY: 88, rotateX: -14, scale: 0.68, transformPerspective: 1000, y: -148 },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        rotateY: [88, 24, -3, 0, 0],
        rotateX: [-14, 8, -2, 0, 0],
        scale: [0.68, 1.18, 0.88, 1.06, 1],
        transformPerspective: 1000,
        y: [-148, 28, -12, 4, 0],
      },
      transition: DEFAULT_REVEAL_TRANSITION,
    },
    [FOIL_TREATMENTS.ETCHED]: {
      initial: { opacity: 0, rotateY: 42, rotateX: -6, scale: 0.78, transformPerspective: 1000, x: -72, y: -52 },
      animate: {
        opacity: [0, 1, 1, 1],
        rotateY: [42, 8, 0, 0],
        rotateX: [-6, 2, 0, 0],
        scale: [0.78, 1.06, 0.99, 1],
        transformPerspective: 1000,
        x: [-72, 8, 0, 0],
        y: [-52, -8, 0, 0],
      },
      transition: { duration: 0.82, times: [0, 0.52, 0.8, 1], ease: [0.16, 1, 0.3, 1] },
    },
    [FOIL_TREATMENTS.GALAXY]: {
      initial: { opacity: 0, rotateY: 74, rotateX: -10, scale: 0.6, transformPerspective: 1000, y: -122 },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        rotateY: [74, 20, -2, 1, 0],
        rotateX: [-10, 5, -1, 0, 0],
        scale: [0.6, 1.16, 0.92, 1.04, 1],
        transformPerspective: 1000,
        y: [-122, 18, -14, -2, 0],
      },
      transition: { duration: 1, times: [0, 0.46, 0.7, 0.88, 1], ease: [0.16, 1, 0.3, 1] },
    },
    [FOIL_TREATMENTS.GILDED]: {
      initial: { opacity: 0, rotateY: 82, rotateX: -16, scale: 0.64, transformPerspective: 1000, y: -180 },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        rotateY: [82, 18, -5, 0, 0],
        rotateX: [-16, 9, -2, 0, 0],
        scale: [0.64, 1.24, 0.84, 1.08, 1],
        transformPerspective: 1000,
        y: [-180, 38, -22, 8, 0],
      },
      transition: { duration: 0.95, times: [0, 0.46, 0.66, 0.84, 1], ease: [0.16, 1, 0.3, 1] },
    },
    [FOIL_TREATMENTS.TEXTURED]: {
      initial: { opacity: 0, rotateY: 70, rotateX: -18, scale: 0.58, transformPerspective: 1000, y: -190 },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        rotateY: [70, 18, -3, 0, 0],
        rotateX: [-18, 11, -3, 0, 0],
        scale: [0.58, 1.28, 0.82, 1.1, 1],
        transformPerspective: 1000,
        y: [-190, 42, -24, 8, 0],
      },
      transition: { duration: 1.02, times: [0, 0.45, 0.66, 0.84, 1], ease: [0.16, 1, 0.3, 1] },
    },
    [FOIL_TREATMENTS.NEON_INK]: {
      initial: { opacity: 0, rotateY: 58, rotateX: -8, scale: 0.72, transformPerspective: 1000, y: -112, x: -18 },
      animate: {
        opacity: [0, 1, 0.86, 1, 1],
        rotateY: [58, 8, -2, 1, 0],
        rotateX: [-8, 2, -1, 0, 0],
        scale: [0.72, 1.14, 0.94, 1.04, 1],
        transformPerspective: 1000,
        y: [-112, 10, -8, 2, 0],
        x: [-18, 10, -6, 0, 0],
      },
      transition: { duration: 0.82, times: [0, 0.42, 0.55, 0.78, 1], ease: [0.16, 1, 0.3, 1] },
    },
  };

  return desktopMotions[treatment] || desktopMotions[FOIL_TREATMENTS.RAINBOW];
}
