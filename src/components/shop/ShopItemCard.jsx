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

  return (
    <Card sx={{ height: '100%', minWidth: 0 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
        <ShopItemPreview item={item} />
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>
              {item.name}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Typography>
          </Box>
          {equipped && <CheckCircleIcon color="success" />}
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Chip label={item.rarity} size="small" sx={{ textTransform: 'capitalize', fontWeight: 900 }} variant="outlined" />
          {owned && <Chip color="success" label="Owned" size="small" variant="outlined" />}
          {equipped && <Chip color="warning" label="Equipped" size="small" />}
        </Stack>
        <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
          {item.description}
        </Typography>
        <Chip
          color="warning"
          icon={<LocalAtmIcon />}
          label={`${item.price.toLocaleString()} Pack Shards`}
          sx={{ alignSelf: 'flex-start', fontWeight: 900 }}
          variant="outlined"
        />
        {owned && isBinderCosmetic ? (
          <Button onClick={onManageBinderCosmetics} startIcon={<AutoAwesomeIcon />} variant="outlined">
            Customize Binder
          </Button>
        ) : owned && isDisplayCase ? (
          <Button disabled startIcon={<AutoAwesomeIcon />} variant="outlined">
            Purchased
          </Button>
        ) : owned ? (
          <Button disabled={equipped} onClick={() => onEquip(item)} startIcon={<AutoAwesomeIcon />} variant={equipped ? 'outlined' : 'contained'}>
            {equipped ? 'Equipped' : 'Equip'}
          </Button>
        ) : (
          <Button disabled={!canAfford} onClick={() => onBuy(item)} startIcon={<AutoAwesomeIcon />} variant={canAfford ? 'contained' : 'outlined'}>
            {canAfford ? 'Buy' : `Need ${missingShards.toLocaleString()} more shards`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
