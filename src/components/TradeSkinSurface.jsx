import { Box } from '@mui/material';
import { useCosmetics } from '../context/CosmeticsContext.jsx';

const TRADE_SKIN_STYLES = {
  'trade-skin-classic-market': {
    className: 'classicMarket',
    bg: 'linear-gradient(135deg, #11100d, #060606 72%)',
    panel: 'linear-gradient(145deg, rgba(34, 27, 19, 0.96), rgba(12, 11, 9, 0.96))',
    border: 'rgba(182, 133, 77, 0.34)',
    accent: '#f4d29b',
    secondary: '#b6854d',
    glow: 'rgba(182, 133, 77, 0.18)',
  },
  'trade-skin-arcane-contract': {
    className: 'arcaneContract',
    bg: 'linear-gradient(135deg, #120f2d, #070611 76%)',
    panel: 'linear-gradient(145deg, rgba(31, 24, 66, 0.96), rgba(9, 7, 18, 0.97))',
    border: 'rgba(143, 124, 255, 0.36)',
    accent: '#f4c95d',
    secondary: '#8f7cff',
    glow: 'rgba(143, 124, 255, 0.2)',
  },
  'trade-skin-treasure-exchange': {
    className: 'treasureExchange',
    bg: 'linear-gradient(135deg, #090705, #050504 72%)',
    panel: 'linear-gradient(145deg, rgba(28, 23, 12, 0.98), rgba(7, 7, 6, 0.97))',
    border: 'rgba(201, 150, 46, 0.42)',
    accent: '#fff0b8',
    secondary: '#c9962e',
    glow: 'rgba(201, 150, 46, 0.2)',
  },
  'trade-skin-neon-terminal': {
    className: 'neonTerminal',
    bg: 'linear-gradient(135deg, #020308, #070018 76%)',
    panel: 'linear-gradient(145deg, rgba(4, 15, 26, 0.97), rgba(17, 3, 26, 0.96))',
    border: 'rgba(0, 245, 255, 0.36)',
    accent: '#00f5ff',
    secondary: '#ff00c8',
    glow: 'rgba(0, 245, 255, 0.18)',
  },
  'trade-skin-guild-hall': {
    className: 'guildHall',
    bg: 'linear-gradient(135deg, #101421, #160c12 72%)',
    panel: 'linear-gradient(145deg, rgba(24, 24, 37, 0.97), rgba(28, 11, 18, 0.96))',
    border: 'rgba(214, 163, 58, 0.34)',
    accent: '#d6a33a',
    secondary: '#7c2438',
    glow: 'rgba(214, 163, 58, 0.16)',
  },
  'trade-skin-cosmic-exchange': {
    className: 'cosmicExchange',
    bg: 'linear-gradient(135deg, #02030c, #100521 74%)',
    panel: 'linear-gradient(145deg, rgba(8, 17, 45, 0.97), rgba(18, 8, 35, 0.96))',
    border: 'rgba(53, 100, 255, 0.36)',
    accent: '#c069ff',
    secondary: '#3564ff',
    glow: 'rgba(53, 100, 255, 0.18)',
  },
};

export default function TradeSkinSurface({ children }) {
  const { getEquippedItem } = useCosmetics();
  const equippedTradeSkin = getEquippedItem('tradeSkin');
  const skin = TRADE_SKIN_STYLES[equippedTradeSkin?.id] || TRADE_SKIN_STYLES['trade-skin-classic-market'];

  return (
    <Box
      className={`tradeSkinSurface tradeSkin-${skin.className}`}
      sx={{
        '--trade-bg': skin.bg,
        '--trade-panel': skin.panel,
        '--trade-border': skin.border,
        '--trade-accent': skin.accent,
        '--trade-secondary': skin.secondary,
        '--trade-glow': skin.glow,
        border: '1px solid var(--trade-border)',
        borderRadius: 2,
        boxShadow: '0 0 36px var(--trade-glow)',
        isolation: 'isolate',
        minWidth: 0,
        overflow: 'hidden',
        p: { xs: 1.5, md: 2.5 },
        position: 'relative',
      }}
    >
      <Box className="tradeSkinBackdrop" />
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}
