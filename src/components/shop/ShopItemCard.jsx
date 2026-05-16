// Shop item card: shared purchase/equip presentation for every cosmetic category.
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ShopItemPreview from './ShopItemPreview.jsx';

const CATEGORY_LABELS = {
  themes: 'Theme',
  openingScenes: 'Opening Scene',
  sleeves: 'Sleeve',
  tearEffects: 'Tear Effect',
  revealEffects: 'Reveal Effect',
  profileCosmetics: 'Profile',
  binderCosmetics: 'Binder Cosmetic',
  displayCases: 'Display Case',
  tradeSkins: 'Trade Skin',
  historyFrames: 'History Frame',
  homeWidgets: 'Home Widget',
};

const RARITY_STYLES = {
  common: { color: '#cfd5e8', bg: 'rgba(207, 213, 232, 0.1)' },
  uncommon: { color: '#4cc9f0', bg: 'rgba(76, 201, 240, 0.1)' },
  rare: { color: '#f4c95d', bg: 'rgba(244, 201, 93, 0.12)' },
  mythic: { color: '#ff8a3d', bg: 'rgba(255, 138, 61, 0.12)' },
  legendary: { color: '#ffe6a3', bg: 'rgba(255, 230, 163, 0.14)' },
};

export default function ShopItemCard({
  canAfford,
  equipped,
  item,
  missingShards = 0,
  onBuy,
  onEquip,
  onManageBinderCosmetics,
  owned,
}) {
  const isBinderCosmetic = item.category === 'binderCosmetics';
  const isDisplayCase = item.category === 'displayCases';
  const rarityStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

  return (
    <Card
      className="shopItemCard"
      sx={{
        height: '100%',
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        borderColor: equipped
          ? 'color-mix(in srgb, var(--accent-color) 58%, var(--panel-border))'
          : owned
            ? 'color-mix(in srgb, var(--secondary-accent) 36%, var(--panel-border))'
            : 'var(--panel-border)',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          borderColor: 'color-mix(in srgb, var(--accent-color) 52%, var(--panel-border))',
          boxShadow: '0 0 34px var(--primary-glow)',
          transform: { xs: 'none', sm: 'translateY(-3px)' },
        },
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.1, sm: 1.35 }, height: '100%', minWidth: 0, p: { xs: 1.25, sm: 2 } }}>
        <ShopItemPreview item={item} />
        <Stack direction="row" justifyContent="space-between" gap={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Typography
              variant="h5"
              sx={{
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                fontSize: { xs: 18, sm: 22 },
                lineHeight: 1.08,
                overflowWrap: 'anywhere',
              }}
            >
              {item.name}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: 11.5, sm: 12.5 }, fontWeight: 900, letterSpacing: 0, textTransform: 'uppercase' }}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Typography>
          </Box>
          {equipped && (
            <Box sx={{ color: 'success.main', display: 'grid', flex: '0 0 auto', placeItems: 'center' }}>
              <CheckCircleIcon />
            </Box>
          )}
        </Stack>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label={item.rarity}
            size="small"
            sx={{
              bgcolor: rarityStyle.bg,
              borderColor: `${rarityStyle.color}88`,
              color: rarityStyle.color,
              textTransform: 'capitalize',
              fontWeight: 950,
              maxWidth: '100%',
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
            variant="outlined"
          />
          {owned && <Chip color="success" label="Owned" size="small" sx={{ fontWeight: 900 }} variant="outlined" />}
          {equipped && <Chip color="warning" label="Equipped" size="small" sx={{ fontWeight: 900 }} />}
        </Stack>
        <Typography color="text.secondary" sx={{ flexGrow: 1, fontSize: { xs: 13.5, sm: 14 }, lineHeight: 1.45 }}>
          {item.description}
        </Typography>
        <Chip
          color="warning"
          icon={<LocalAtmIcon />}
          label={`${item.price.toLocaleString()} Pack Shards`}
          sx={{
            alignSelf: 'flex-start',
            maxWidth: '100%',
            height: 'auto',
            fontWeight: 950,
            '& .MuiChip-label': {
              display: 'block',
              overflow: 'hidden',
              py: 0.55,
              textOverflow: 'ellipsis',
            },
          }}
          variant="outlined"
        />
        {owned && isBinderCosmetic ? (
          <Button fullWidth onClick={onManageBinderCosmetics} startIcon={<AutoAwesomeIcon />} variant="outlined" sx={{ minHeight: 42, whiteSpace: 'normal' }}>
            Customize binder
          </Button>
        ) : owned && isDisplayCase ? (
          <Button disabled fullWidth startIcon={<AutoAwesomeIcon />} variant="outlined" sx={{ minHeight: 42, whiteSpace: 'normal' }}>
            Owned
          </Button>
        ) : owned ? (
          <Button fullWidth disabled={equipped} onClick={() => onEquip(item)} startIcon={<AutoAwesomeIcon />} variant={equipped ? 'outlined' : 'contained'} sx={{ minHeight: 42, whiteSpace: 'normal' }}>
            {equipped ? 'Equipped' : 'Equip'}
          </Button>
        ) : (
          <Button fullWidth disabled={!canAfford} onClick={() => onBuy(item)} startIcon={<AutoAwesomeIcon />} variant={canAfford ? 'contained' : 'outlined'} sx={{ minHeight: 42, whiteSpace: 'normal' }}>
            {canAfford ? 'Buy' : `Need ${missingShards.toLocaleString()} more Pack Shards`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
