// Card sleeves render only card backs or empty/hidden states, never revealed card faces.
import { Box } from '@mui/material';

const SIZE_STYLES = {
  small: { width: 34, borderRadius: 0.8 },
  medium: { width: 64, borderRadius: 1.2 },
  large: { width: 120, borderRadius: 2 },
};

const DEFAULT_SLEEVE = {
  accent: '#d9d9d9',
  background:
    'linear-gradient(145deg, #050505, #17191f 58%, #050505), radial-gradient(circle at 50% 28%, rgba(255,255,255,0.12), transparent 34%)',
  border: '#3a3d45',
  emblem: 'MTG',
  glow: 'rgba(255,255,255,0.16)',
  pattern:
    'linear-gradient(120deg, transparent 32%, rgba(255,255,255,0.08), transparent 68%)',
};

const SLEEVE_STYLES = {
  'sleeve-arcane': {
    accent: '#f4c95d',
    background:
      'radial-gradient(circle at 50% 30%, rgba(244,201,93,0.22), transparent 30%), linear-gradient(145deg, #120f2d, #34227a 58%, #070714)',
    border: '#7d6bff',
    emblem: 'A',
    glow: 'rgba(125,107,255,0.42)',
    pattern:
      'radial-gradient(circle at 28% 24%, rgba(244,201,93,0.28) 0 1px, transparent 2px), radial-gradient(circle at 72% 74%, rgba(125,107,255,0.28) 0 1px, transparent 2px), linear-gradient(120deg, transparent 34%, rgba(255,255,255,0.18), transparent 66%)',
  },
  'sleeve-gold-collector': {
    accent: '#fff0b3',
    background:
      'radial-gradient(circle at 50% 24%, rgba(255,240,179,0.24), transparent 30%), linear-gradient(145deg, #060606, #3a2608 62%, #050505)',
    border: '#c7952d',
    emblem: 'G',
    glow: 'rgba(255,210,98,0.4)',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255,240,179,0.12) 0 1px, transparent 1px 12px), linear-gradient(120deg, transparent 32%, rgba(255,255,255,0.24), transparent 66%)',
  },
  'sleeve-galaxy': {
    accent: '#b45cff',
    background:
      'radial-gradient(circle at 32% 28%, rgba(71,120,255,0.36), transparent 26%), radial-gradient(circle at 72% 68%, rgba(180,92,255,0.34), transparent 30%), linear-gradient(145deg, #050717, #101a52 62%, #02030a)',
    border: '#4778ff',
    emblem: 'S',
    glow: 'rgba(71,120,255,0.42)',
    pattern:
      'radial-gradient(circle at 22% 32%, rgba(255,255,255,0.8) 0 1px, transparent 2px), radial-gradient(circle at 76% 22%, rgba(255,255,255,0.56) 0 1px, transparent 2px), radial-gradient(circle at 58% 78%, rgba(255,255,255,0.68) 0 1px, transparent 2px)',
  },
  'sleeve-dragon-scale': {
    accent: '#ff9f35',
    background:
      'radial-gradient(circle at 50% 70%, rgba(255,159,53,0.2), transparent 28%), linear-gradient(145deg, #160605, #5c120c 58%, #080202)',
    border: '#b8281d',
    emblem: 'D',
    glow: 'rgba(255,92,42,0.38)',
    pattern:
      'radial-gradient(ellipse at 25% 25%, rgba(255,159,53,0.18), transparent 34%), radial-gradient(ellipse at 75% 45%, rgba(255,159,53,0.14), transparent 34%), radial-gradient(ellipse at 35% 74%, rgba(255,159,53,0.14), transparent 34%)',
  },
  'sleeve-moonlit': {
    accent: '#f7f9ff',
    background:
      'radial-gradient(circle at 50% 22%, rgba(247,249,255,0.24), transparent 32%), linear-gradient(145deg, #101724, #314154 62%, #070b12)',
    border: '#97abc5',
    emblem: 'M',
    glow: 'rgba(180,205,235,0.34)',
    pattern:
      'linear-gradient(120deg, transparent 34%, rgba(247,249,255,0.22), transparent 66%), radial-gradient(circle at 50% 24%, rgba(247,249,255,0.24), transparent 18%)',
  },
  'sleeve-neon': {
    accent: '#00f5ff',
    background:
      'radial-gradient(circle at 26% 28%, rgba(0,245,255,0.24), transparent 28%), radial-gradient(circle at 72% 72%, rgba(255,0,200,0.22), transparent 30%), linear-gradient(145deg, #03040a, #090b18 62%, #020207)',
    border: '#ff00c8',
    emblem: 'N',
    glow: 'rgba(0,245,255,0.42)',
    pattern:
      'linear-gradient(118deg, transparent 0 44%, rgba(0,245,255,0.38) 45%, transparent 48%), linear-gradient(62deg, transparent 0 54%, rgba(255,0,200,0.34) 55%, transparent 58%)',
  },
  'sleeve-eldritch': {
    accent: '#c2ffd2',
    background:
      'radial-gradient(circle at 50% 42%, rgba(41,201,111,0.24), transparent 32%), linear-gradient(145deg, #04100a, #0f3a21 58%, #020704)',
    border: '#29c96f',
    emblem: 'E',
    glow: 'rgba(41,201,111,0.38)',
    pattern:
      'radial-gradient(circle at 30% 30%, rgba(194,255,210,0.24) 0 1px, transparent 3px), radial-gradient(circle at 70% 70%, rgba(41,201,111,0.24) 0 1px, transparent 3px), linear-gradient(120deg, transparent 34%, rgba(194,255,210,0.18), transparent 66%)',
  },
  'sleeve-minimal-black': DEFAULT_SLEEVE,
};

export default function CardSleeve({ animated = false, sleeveId, size = 'medium' }) {
  const sleeve = SLEEVE_STYLES[sleeveId] || DEFAULT_SLEEVE;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.medium;

  return (
    <Box
      aria-hidden="true"
      className={animated ? 'cardSleeve cardSleeve-animated' : 'cardSleeve'}
      sx={{
        position: 'relative',
        width: sizeStyle.width,
        aspectRatio: '5 / 7',
        overflow: 'hidden',
        border: `2px solid ${sleeve.border}`,
        borderRadius: sizeStyle.borderRadius,
        background: sleeve.background,
        boxShadow: `0 0 ${size === 'large' ? 34 : 18}px ${sleeve.glow}, inset 0 0 18px rgba(255,255,255,0.08)`,
        transform: 'translateZ(0)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: sleeve.pattern,
          backgroundSize: '82px 82px, 100% 100%',
          opacity: 0.72,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 5,
          border: `1px solid ${sleeve.accent}66`,
          borderRadius: `calc(${sizeStyle.borderRadius * 8}px - 1px)`,
          pointerEvents: 'none',
        },
        ...(animated
          ? {
              '@media (prefers-reduced-motion: no-preference)': {
                '&::before': {
                  animation: 'cardSleeveDrift 5.8s ease-in-out infinite alternate',
                },
              },
            }
          : {}),
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          display: 'grid',
          width: size === 'small' ? 18 : size === 'large' ? 54 : 32,
          height: size === 'small' ? 18 : size === 'large' ? 54 : 32,
          placeItems: 'center',
          border: `1px solid ${sleeve.accent}99`,
          borderRadius: '50%',
          bgcolor: 'rgba(5, 7, 17, 0.52)',
          boxShadow: `0 0 18px ${sleeve.glow}`,
          color: sleeve.accent,
          fontSize: size === 'small' ? 8 : size === 'large' ? 18 : 12,
          fontWeight: 950,
          letterSpacing: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {sleeve.emblem}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(120deg, transparent 34%, rgba(255,255,255,0.18), transparent 62%)',
          opacity: animated ? 0.68 : 0.36,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
