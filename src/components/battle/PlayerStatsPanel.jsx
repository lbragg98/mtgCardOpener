import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import StyleIcon from '@mui/icons-material/Style';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';

export default function PlayerStatsPanel({ badge = '', deckCount = 0, graveyardCount = 0, handCount = 0, health = 20, mana = 0, maxMana = 0, name, owner = 'player' }) {
  return (
    <Card className={`battleStatsPanel ${owner}`}>
      <CardContent sx={{ display: 'grid', gap: 1.1, p: { xs: 1.25, sm: 1.6 }, '&:last-child': { pb: { xs: 1.25, sm: 1.6 } } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" gap={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography fontWeight={950} noWrap>{name}</Typography>
            {badge && <Chip color="info" label={badge} size="small" variant="outlined" />}
          </Stack>
          <Box className="battleManaGems">
            {Array.from({ length: Math.max(1, maxMana || 1) }).slice(0, 10).map((_, index) => (
              <Box key={index} className={index < mana ? 'manaGem filled' : 'manaGem'} />
            ))}
          </Box>
        </Stack>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          <Chip color="error" icon={<FavoriteIcon />} label={`${health} health`} size="small" variant="outlined" />
          <Chip color="warning" icon={<LocalAtmIcon />} label={`${mana}/${maxMana} mana`} size="small" variant="outlined" />
          <Chip color="secondary" icon={<StyleIcon />} label={`${handCount} hand`} size="small" variant="outlined" />
          <Chip icon={<AutoStoriesIcon />} label={`${deckCount} deck`} size="small" variant="outlined" />
          <Chip icon={<WhatshotIcon />} label={`${graveyardCount} grave`} size="small" variant="outlined" />
        </Stack>
      </CardContent>
    </Card>
  );
}
