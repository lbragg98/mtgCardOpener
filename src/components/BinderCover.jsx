import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PublicIcon from '@mui/icons-material/Public';
import ShieldIcon from '@mui/icons-material/Shield';
import StarsIcon from '@mui/icons-material/Stars';
import TollIcon from '@mui/icons-material/Toll';
import { Box } from '@mui/material';

const ICON_BY_VISUAL = {
  arcane: <AutoAwesomeIcon fontSize="large" />,
  eldritch: <PublicIcon fontSize="large" />,
  guild: <ShieldIcon fontSize="large" />,
  legendary: <StarsIcon fontSize="large" />,
  moon: <TollIcon fontSize="large" />,
  stars: <StarsIcon fontSize="large" />,
  vault: <LockIcon fontSize="large" />,
  scales: <ShieldIcon fontSize="large" />,
};

const HEIGHT_BY_SIZE = {
  small: { xs: 150, sm: 170 },
  medium: { xs: 210, sm: 235 },
  large: { xs: 250, md: 330 },
};

const EMBLEM_BY_SIZE = {
  small: { xs: 56, sm: 62 },
  medium: { xs: 72, sm: 82 },
  large: { xs: 86, md: 106 },
};

function getThemePattern(visualType, colors) {
  const accent = colors.accent;

  switch (visualType) {
    case 'leather':
      return `repeating-linear-gradient(8deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, ${accent}22 0 1px, transparent 1px 18px)`;
    case 'arcane':
      return `radial-gradient(circle at 50% 50%, transparent 0 18%, ${accent}3b 19% 20%, transparent 21% 34%, ${accent}2f 35% 36%, transparent 37%), linear-gradient(90deg, transparent 46%, ${accent}44 48% 52%, transparent 54%)`;
    case 'sigil':
      return `radial-gradient(circle at 50% 50%, transparent 0 22%, ${accent}42 23% 24%, transparent 25% 38%, ${accent}30 39% 40%, transparent 41%), conic-gradient(from 45deg, transparent, ${accent}26, transparent, ${accent}1f, transparent)`;
    case 'guild':
      return `linear-gradient(45deg, transparent 40%, ${accent}38 41% 44%, transparent 45%), linear-gradient(-45deg, transparent 40%, ${accent}22 41% 44%, transparent 45%)`;
    case 'scales':
      return `radial-gradient(circle at 10px 10px, ${accent}2e 0 7px, transparent 8px), radial-gradient(circle at 28px 28px, rgba(255,255,255,0.08) 0 7px, transparent 8px)`;
    case 'moon':
      return `radial-gradient(circle at 68% 28%, ${accent}88 0 15px, transparent 16px), radial-gradient(circle at 72% 26%, rgba(5,7,17,0.82) 0 13px, transparent 14px), radial-gradient(circle at 24% 72%, rgba(255,255,255,0.7) 0 1px, transparent 2px)`;
    case 'vault':
      return `linear-gradient(90deg, transparent 20%, ${accent}36 21% 23%, transparent 24% 76%, ${accent}2f 77% 79%, transparent 80%), repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 16px)`;
    case 'eldritch':
      return `radial-gradient(ellipse at 20% 30%, ${accent}30, transparent 28%), repeating-radial-gradient(circle at 70% 48%, transparent 0 10px, ${accent}24 11px 12px, transparent 13px 22px)`;
    case 'stars':
      return `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.86) 0 1px, transparent 2px), radial-gradient(circle at 76% 44%, ${accent}cc 0 1px, transparent 2px), radial-gradient(circle at 52% 74%, rgba(255,255,255,0.72) 0 1px, transparent 2px), linear-gradient(35deg, transparent 48%, ${accent}24 49% 51%, transparent 52%)`;
    case 'legendary':
      return `linear-gradient(90deg, transparent 18%, ${accent}3a 19% 20%, transparent 21% 79%, ${accent}32 80% 81%, transparent 82%), radial-gradient(circle at 50% 50%, ${accent}22, transparent 34%)`;
    default:
      return `linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.12) 48%, transparent 64%)`;
  }
}

export default function BinderCover({ animated = true, binder, compact = false, owned = false, size }) {
  const resolvedSize = size || (compact ? 'small' : 'medium');
  const icon = ICON_BY_VISUAL[binder?.visualType] || <MenuBookIcon fontSize="large" />;
  const colors = binder?.colors || { primary: '#222', secondary: '#070913', accent: '#f4c95d' };
  const pattern = getThemePattern(binder?.visualType, colors);
  const binderCosmetics = binder?.cosmetics || {};

  return (
    <Box
      className={[
        'binderCover',
        `binderCover-${resolvedSize}`,
        `binderCover-${binder?.rarity || 'common'}`,
        binderCosmetics.claspId ? `binderClaspCosmetic-${binderCosmetics.claspId}` : '',
        binderCosmetics.auraId ? `binderAuraCosmetic-${binderCosmetics.auraId}` : '',
        animated ? 'binderCover-animated' : '',
        owned ? 'binderCover-owned' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={{
        '--binder-primary': colors.primary,
        '--binder-secondary': colors.secondary,
        '--binder-accent': colors.accent,
        '--binder-pattern': pattern,
        position: 'relative',
        width: '100%',
        minHeight: HEIGHT_BY_SIZE[resolvedSize] || HEIGHT_BY_SIZE.medium,
        perspective: 900,
      }}
    >
      <Box className="binderBook">
        <Box className="binderPageEdges" />
        <Box className="binderCoverFace">
          <Box className="binderTexture" />
          <Box className="binderThemePattern" />
          <Box className="binderSpine">
            <Box className="binderSpineRibs" />
          </Box>
          <Box className="binderInnerFrame" />
          <Box className="binderCorner binderCorner-tl" />
          <Box className="binderCorner binderCorner-tr" />
          <Box className="binderCorner binderCorner-bl" />
          <Box className="binderCorner binderCorner-br" />
          <Box className="binderClasp">
            <Box className="binderClaspPin" />
          </Box>
          <Box
            className="binderEmblem"
            sx={{
              width: EMBLEM_BY_SIZE[resolvedSize] || EMBLEM_BY_SIZE.medium,
              height: EMBLEM_BY_SIZE[resolvedSize] || EMBLEM_BY_SIZE.medium,
            }}
          >
            <Box className="binderEmblemRing" />
            {icon}
          </Box>
          <Box className="binderGloss" />
          <Box className="binderShine" />
        </Box>
      </Box>
    </Box>
  );
}
