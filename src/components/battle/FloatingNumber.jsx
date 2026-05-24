import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const TYPE_COLORS = {
  buff: '#8cffb0',
  damage: '#ff7a6f',
  debuff: '#d8a2ff',
  heal: '#ffe48f',
};

export default function FloatingNumber({ amount, position = 'center', type = 'damage' }) {
  const label = typeof amount === 'string'
    ? amount
    : `${type === 'damage' || type === 'debuff' ? '-' : '+'}${amount || 1}`;

  return (
    <Box
      animate={{ opacity: 0, scale: type === 'debuff' ? [1, 1.12, 1] : 1.08, y: -52, x: type === 'debuff' ? [0, -5, 5, 0] : 0 }}
      component={motion.div}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0, scale: 0.82, y: 0 }}
      sx={{
        color: TYPE_COLORS[type] || TYPE_COLORS.damage,
        fontSize: { xs: 26, sm: 36 },
        fontWeight: 950,
        left: position === 'enemy' ? '50%' : position === 'player' ? '50%' : '50%',
        pointerEvents: 'none',
        position: 'absolute',
        textShadow: '0 0 16px rgba(0,0,0,0.9), 0 0 18px currentColor',
        top: position === 'enemy' ? '23%' : position === 'player' ? '74%' : '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 25,
      }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {label}
    </Box>
  );
}
