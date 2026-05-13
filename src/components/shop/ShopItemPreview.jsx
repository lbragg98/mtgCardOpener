import { Box, Typography } from '@mui/material';
import CardSleeve from '../CardSleeve.jsx';
import ProfileCosmeticsPreview from '../ProfileCosmeticsPreview.jsx';

const previewShellSx = (primary, secondary, accent) => ({
  position: 'relative',
  display: 'grid',
  width: '100%',
  maxWidth: '100%',
  minHeight: { xs: 118, sm: 150 },
  overflow: 'hidden',
  placeItems: 'center',
  p: { xs: 1, sm: 0 },
  borderRadius: 2,
  border: '1px solid rgba(248, 247, 255, 0.14)',
  background:
    `radial-gradient(circle at 18% 18%, ${accent}77, transparent 30%), ` +
    `radial-gradient(circle at 84% 72%, ${secondary}66, transparent 36%), ` +
    `linear-gradient(135deg, ${primary}, #050711 74%)`,
  boxShadow: `inset 0 0 34px rgba(255,255,255,0.06), 0 18px 34px rgba(0,0,0,0.22)`,
  '@media (prefers-reduced-motion: reduce)': {
    '& *': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
    },
  },
});

function ColorSwatches({ colors }) {
  return (
    <Box sx={{ position: 'absolute', right: { xs: 8, sm: 10 }, bottom: { xs: 8, sm: 10 }, display: 'flex', gap: 0.5 }}>
      {colors.map((color) => (
        <Box
          key={color}
          sx={{
            width: { xs: 12, sm: 15 },
            height: { xs: 12, sm: 15 },
            borderRadius: 999,
            bgcolor: color,
            border: '1px solid rgba(255,255,255,0.46)',
            boxShadow: '0 0 10px rgba(0,0,0,0.32)',
          }}
        />
      ))}
    </Box>
  );
}

function ThemePreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ width: { xs: '92%', sm: '82%' }, maxWidth: 260, display: 'grid', gap: { xs: 0.75, sm: 1 } }}>
      <Box sx={{ height: { xs: 11, sm: 14 }, borderRadius: 999, background: `linear-gradient(90deg, ${accent}, ${secondary})`, boxShadow: `0 0 20px ${accent}66` }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 1 }}>
        <Box sx={{ height: { xs: 56, sm: 70 }, borderRadius: 1.4, border: `1px solid ${accent}77`, background: `linear-gradient(145deg, ${primary}, rgba(255,255,255,0.08))` }} />
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          {[0, 1, 2].map((index) => (
            <Box key={index} sx={{ height: { xs: index === 0 ? 17 : 13, sm: index === 0 ? 22 : 17 }, borderRadius: 1, bgcolor: index === 0 ? `${secondary}55` : 'rgba(248,247,255,0.12)' }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ScenePreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ position: 'relative', width: { xs: '92%', sm: '86%' }, maxWidth: 280, height: { xs: 72, sm: 86 }, overflow: 'hidden', borderRadius: 2, border: `1px solid ${accent}88`, background: `linear-gradient(145deg, ${primary}, ${secondary}55)` }}>
      <Box sx={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 28% 28%, ${accent}88, transparent 22%), radial-gradient(circle at 72% 62%, ${secondary}77, transparent 30%)` }} />
      <Box sx={{ position: 'absolute', left: 16, right: 16, bottom: 14, height: 12, borderRadius: 999, background: 'rgba(5,7,17,0.72)', boxShadow: `0 0 22px ${accent}66` }} />
      <Box sx={{ position: 'absolute', left: '50%', top: '48%', width: 42, height: 58, borderRadius: 1.2, border: `1px solid ${accent}aa`, transform: 'translate(-50%, -50%) rotate(-4deg)', background: 'rgba(248,247,255,0.12)' }} />
    </Box>
  );
}

function TearPreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ position: 'relative', width: { xs: '92%', sm: '84%' }, maxWidth: 280, height: { xs: 60, sm: 72 }, borderRadius: 2, border: `1px solid ${accent}88`, background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.94))`, boxShadow: `0 0 24px ${accent}44` }}>
      <Box sx={{ position: 'absolute', left: 12, right: 12, top: '50%', height: 5, borderRadius: 999, background: `linear-gradient(90deg, transparent, ${secondary}, ${accent}, transparent)`, boxShadow: `0 0 18px ${accent}`, transform: 'translateY(-50%)' }} />
      <Box sx={{ position: 'absolute', inset: '10px 14px auto', height: 18, borderRadius: 1, border: '1px solid rgba(248,247,255,0.14)', background: 'rgba(248,247,255,0.08)' }} />
      {[18, 44, 70].map((left) => (
        <Box key={left} sx={{ position: 'absolute', left: `${left}%`, top: '50%', width: 6, height: 6, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 12px ${accent}` }} />
      ))}
    </Box>
  );
}

function RevealPreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ position: 'relative', width: { xs: 62, sm: 76 }, height: { xs: 82, sm: 100 }, borderRadius: 1.8, border: `1px solid ${accent}aa`, background: `linear-gradient(145deg, ${primary}, rgba(248,247,255,0.12))`, boxShadow: `0 0 30px ${accent}66` }}>
      <Box sx={{ position: 'absolute', inset: { xs: -10, sm: -18 }, border: `2px solid ${secondary}77`, borderRadius: '50%', boxShadow: `0 0 28px ${accent}66` }} />
      <Box sx={{ position: 'absolute', inset: 10, borderRadius: 1, background: `radial-gradient(circle at 50% 34%, ${accent}66, transparent 38%), rgba(5,7,17,0.7)` }} />
    </Box>
  );
}

function BinderPreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ position: 'relative', width: { xs: 82, sm: 96 }, height: { xs: 94, sm: 110 }, borderRadius: '10px 10px 7px 7px', border: `1px solid ${accent}aa`, background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.96))`, boxShadow: `0 0 28px ${accent}55` }}>
      <Box sx={{ position: 'absolute', left: 12, top: 10, bottom: 10, width: 6, borderRadius: 999, bgcolor: `${secondary}88` }} />
      <Box sx={{ position: 'absolute', left: 28, right: 12, top: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.7 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index} sx={{ height: 18, borderRadius: 0.75, border: '1px solid rgba(248,247,255,0.16)', bgcolor: index === 1 ? `${accent}33` : 'rgba(248,247,255,0.08)' }} />
        ))}
      </Box>
    </Box>
  );
}

function DisplayCasePreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ width: { xs: '92%', sm: '86%' }, maxWidth: 280, height: { xs: 68, sm: 82 }, p: 1, borderRadius: 2, border: `1px solid ${accent}99`, background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.94))`, boxShadow: `0 0 28px ${accent}44` }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.8, height: '100%' }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box key={index} sx={{ borderRadius: 1, border: `1px solid ${index === 2 ? accent : 'rgba(248,247,255,0.18)'}`, background: index === 2 ? `linear-gradient(145deg, ${secondary}66, ${accent}33)` : 'rgba(248,247,255,0.08)' }} />
        ))}
      </Box>
    </Box>
  );
}

function TradePreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ width: { xs: '94%', sm: '88%' }, maxWidth: 300, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: { xs: 0.75, sm: 1 } }}>
      {['Give', 'Get'].map((label, index) => (
        <Box key={label} sx={{ height: { xs: 68, sm: 82 }, minWidth: 0, p: { xs: 0.75, sm: 1 }, borderRadius: 2, border: `1px solid ${index ? secondary : accent}88`, background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.88))`, boxShadow: `0 0 18px ${index ? secondary : accent}44` }}>
          <Typography sx={{ color: index ? secondary : accent, fontSize: 10, fontWeight: 950, mb: 0.7 }}>{label}</Typography>
          {[0, 1, 2].map((row) => (
            <Box key={row} sx={{ height: 10, mb: 0.6, borderRadius: 999, bgcolor: row === 0 ? `${index ? secondary : accent}44` : 'rgba(248,247,255,0.12)' }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function HistoryPreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ position: 'relative', width: { xs: '92%', sm: '84%' }, maxWidth: 280, height: { xs: 78, sm: 88 }, p: { xs: 1, sm: 1.2 }, borderRadius: 2, border: `1px solid ${accent}aa`, background: `linear-gradient(145deg, ${primary}, rgba(5,7,17,0.94))`, boxShadow: `0 0 26px ${accent}44` }}>
      <Box sx={{ height: 13, width: '52%', borderRadius: 999, bgcolor: `${accent}66`, mb: 1 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.7 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Box key={index} sx={{ height: 34, borderRadius: 0.8, border: '1px solid rgba(248,247,255,0.16)', bgcolor: index === 3 ? `${secondary}44` : 'rgba(248,247,255,0.08)' }} />
        ))}
      </Box>
      <Typography sx={{ position: 'absolute', inset: 'auto 10px 7px', color: 'rgba(248, 247, 255, 0.76)', fontSize: 10.5, fontWeight: 900, lineHeight: 1.1, textAlign: 'center' }}>
        Applies to Pack History when available.
      </Typography>
    </Box>
  );
}

function WidgetPreview({ accent, primary, secondary }) {
  return (
    <Box sx={{ width: { xs: '92%', sm: '86%' }, maxWidth: 280, display: 'grid', gap: 0.8 }}>
      <Box sx={{ height: 22, borderRadius: 1.2, border: `1px solid ${accent}88`, background: `linear-gradient(90deg, ${accent}55, ${secondary}33)` }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 0.8 }}>
        <Box sx={{ height: 62, borderRadius: 1.5, bgcolor: 'rgba(248,247,255,0.1)', border: '1px solid rgba(248,247,255,0.16)' }} />
        <Box sx={{ height: 62, borderRadius: 1.5, bgcolor: `${accent}22`, border: `1px solid ${accent}77` }} />
      </Box>
    </Box>
  );
}

export default function ShopItemPreview({ item }) {
  const colors = item?.previewColors?.length ? item.previewColors : ['#101421', '#f4c95d', '#7f8cff'];
  const [primary, secondary, accent] = colors;
  const category = item?.category;

  if (category === 'profileCosmetics') {
    return <ProfileCosmeticsPreview item={item} />;
  }

  function renderPreview() {
    if (category === 'themes') return <ThemePreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'openingScenes') return <ScenePreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'sleeves') return <CardSleeve animated sleeveId={item.id} size="medium" />;
    if (category === 'tearEffects') return <TearPreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'revealEffects') return <RevealPreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'binderCosmetics') return <BinderPreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'displayCases') return <DisplayCasePreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'tradeSkins') return <TradePreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'historyFrames') return <HistoryPreview accent={accent} primary={primary} secondary={secondary} />;
    if (category === 'homeWidgets') return <WidgetPreview accent={accent} primary={primary} secondary={secondary} />;

    return (
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
    );
  }

  return (
    <Box sx={previewShellSx(primary, secondary, accent)}>
      {renderPreview()}
      <ColorSwatches colors={colors} />
    </Box>
  );
}
