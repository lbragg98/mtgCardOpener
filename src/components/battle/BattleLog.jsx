import { Card, CardContent, List, ListItem, ListItemText, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

const LOG_COLORS = {
  damage: { border: 'rgba(248, 113, 113, 0.72)', color: '#fecaca' },
  defeat: { border: 'rgba(248, 113, 113, 0.72)', color: '#fecaca' },
  destroy: { border: 'rgba(244, 63, 94, 0.72)', color: '#fecdd3' },
  draw: { border: 'rgba(96, 165, 250, 0.72)', color: '#bfdbfe' },
  heal: { border: 'rgba(74, 222, 128, 0.72)', color: '#bbf7d0' },
  spell: { border: 'rgba(168, 85, 247, 0.72)', color: '#e9d5ff' },
  summon: { border: 'rgba(250, 204, 21, 0.72)', color: '#fef3c7' },
  turn: { border: 'rgba(148, 163, 184, 0.72)', color: '#e2e8f0' },
  victory: { border: 'rgba(34, 197, 94, 0.84)', color: '#dcfce7' },
};

function getLogStyle(type) {
  return LOG_COLORS[type] || { border: 'var(--panel-border)', color: 'text.secondary' };
}

export default function BattleLog({ animationSpeed = 1, entries = [] }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'grid', gap: 1 }}>
        <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
          Battle Log
        </Typography>
        <List dense sx={{ maxHeight: 260, overflow: 'auto', py: 0 }}>
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => {
              const style = getLogStyle(entry.type);

              return (
                <ListItem
                  component={motion.li}
                  disableGutters
                  exit={{ opacity: 0, x: -12 }}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 * animationSpeed }}
                  key={entry.id || `${entry.message || entry}-${index}`}
                  sx={{
                    borderLeft: `3px solid ${style.border}`,
                    mb: 0.5,
                    pl: 1,
                  }}
                >
                  <ListItemText
                    primary={entry.message || entry}
                    secondary={entry.type}
                    primaryTypographyProps={{ color: index === 0 ? style.color : 'text.secondary', fontSize: 13, fontWeight: index === 0 ? 800 : 500 }}
                    secondaryTypographyProps={{ color: style.color, fontSize: 11, textTransform: 'uppercase' }}
                  />
                </ListItem>
              );
            })}
          </AnimatePresence>
        </List>
      </CardContent>
    </Card>
  );
}
