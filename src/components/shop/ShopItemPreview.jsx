import { Box } from '@mui/material';
import CardSleeve from '../CardSleeve.jsx';
import ProfileCosmeticsPreview from '../ProfileCosmeticsPreview.jsx';

export default function ShopItemPreview({ item }) {
  const colors = item?.previewColors?.length ? item.previewColors : ['#101421', '#f4c95d', '#7f8cff'];
  const [primary, secondary, accent] = colors;
  const isSleeve = item?.category === 'sleeves';
  const isTearEffect = item?.category === 'tearEffects';
  const isRevealEffect = item?.category === 'revealEffects';
  const isBinderCosmetic = item?.category === 'binderCosmetics';
  const isDisplayCase = item?.category === 'displayCases';
  const isTradeSkin = item?.category === 'tradeSkins';

  if (item?.category === 'profileCosmetics') {
    return <ProfileCosmeticsPreview item={item} />;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: 142,
        overflow: 'hidden',
        placeItems: 'center',
        borderRadius: 1.5,
        border: '1px solid rgba(248, 247, 255, 0.12)',
        background:
          `radial-gradient(circle at 22% 20%, ${accent}88, transparent 32%), ` +
          `radial-gradient(circle at 78% 72%, ${secondary}88, transparent 36%), ` +
          `linear-gradient(135deg, ${primary}, #050711 72%)`,
        }}
      >
      {isSleeve ? (
        <CardSleeve animated sleeveId={item.id} size="medium" />
      ) : isTearEffect || isRevealEffect || isBinderCosmetic || isDisplayCase || isTradeSkin ? (
        <Box
          sx={{
            position: 'relative',
            width: isRevealEffect ? 72 : isBinderCosmetic ? 86 : isDisplayCase || isTradeSkin ? '86%' : '78%',
            height: isRevealEffect ? 92 : isBinderCosmetic ? 104 : isDisplayCase || isTradeSkin ? 78 : 56,
            borderRadius: isRevealEffect ? 1.5 : isBinderCosmetic ? '10px 10px 7px 7px' : 2,
            border: `1px solid ${accent}88`,
            background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.92))`,
            boxShadow: `0 0 28px ${accent}55, inset 0 0 18px rgba(255,255,255,0.08)`,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: isRevealEffect ? -18 : isBinderCosmetic ? 12 : isDisplayCase || isTradeSkin ? 14 : 10,
              right: isRevealEffect ? -18 : isBinderCosmetic ? 12 : isDisplayCase || isTradeSkin ? 14 : 10,
              top: '50%',
              height: isRevealEffect ? 72 : isBinderCosmetic ? 62 : isDisplayCase || isTradeSkin ? 42 : 4,
              borderRadius: 999,
              border: isRevealEffect || isBinderCosmetic || isTradeSkin ? `2px solid ${secondary}99` : 'none',
              background: isRevealEffect || isBinderCosmetic || isTradeSkin ? 'transparent' : `linear-gradient(90deg, transparent, ${secondary}, ${accent}, transparent)`,
              boxShadow: `0 0 18px ${accent}`,
              transform: 'translateY(-50%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: '48%',
              top: '50%',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}, transparent 68%)`,
              transform: 'translate(-50%, -50%)',
            },
          }}
        />
      ) : (
        <Box
          sx={{
            width: 96,
            height: 64,
            borderRadius: 999,
            border: `2px solid ${accent}`,
            background: `linear-gradient(145deg, ${primary}, ${secondary})`,
            boxShadow: `0 0 28px ${accent}66, inset 0 0 20px rgba(255,255,255,0.12)`,
          }}
        />
      )}
      <Box sx={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', gap: 0.5 }}>
        {colors.map((color) => (
          <Box
            key={color}
            sx={{
              width: 16,
              height: 16,
              borderRadius: 999,
              bgcolor: color,
              border: '1px solid rgba(255,255,255,0.42)',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
