import { Box, Chip, Typography } from '@mui/material';

const STYLE_BY_ID = {
  'avatar-frame-bronze': ['#a96f32', '#e0ad68'],
  'avatar-frame-silver': ['#9fb7d6', '#f7f8ff'],
  'avatar-frame-gold': ['#c9962e', '#fff0b8'],
  'avatar-frame-galaxy': ['#3564ff', '#c069ff'],
  'avatar-frame-neon': ['#00f5ff', '#ff00c8'],
  'avatar-frame-mythic-flame': ['#b82418', '#ffba4a'],
  'profile-banner-arcane-library': ['#120f2d', '#8f7cff', '#f4c95d'],
  'profile-banner-collector-vault': ['#090705', '#c9962e', '#fff0b8'],
  'profile-banner-galaxy': ['#02030c', '#3564ff', '#c069ff'],
  'profile-banner-dragonfire': ['#130604', '#b82418', '#ffba4a'],
  'profile-banner-neon-rift': ['#020308', '#00f5ff', '#ff00c8'],
  'title-pack-goblin': ['#38d978', '#f4c95d'],
  'title-foil-hunter': ['#97abc5', '#f7f9ff'],
  'title-mythic-seeker': ['#8f7cff', '#f4c95d'],
  'title-shard-baron': ['#c9962e', '#fff0b8'],
  'title-binder-mage': ['#24c96d', '#b8ffcf'],
  'title-collector-supreme': ['#c9962e', '#fff0b8'],
  'title-galaxy-puller': ['#3564ff', '#c069ff'],
  'title-neon-chaser': ['#00f5ff', '#ff00c8'],
};

function getColors(item) {
  return STYLE_BY_ID[item?.id] || item?.previewColors || ['#8f7cff', '#f4c95d'];
}

export default function ProfileCosmeticsPreview({ item }) {
  const colors = getColors(item);
  const [primary, secondary, accent = secondary] = colors;
  const isBanner = item?.equipSlot === 'profileBanner';
  const isTitle = item?.equipSlot === 'titleBadge';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: 142,
        overflow: 'hidden',
        placeItems: 'center',
        border: '1px solid rgba(248, 247, 255, 0.12)',
        borderRadius: 1.5,
        background:
          `radial-gradient(circle at 18% 20%, ${accent}66, transparent 32%), ` +
          `linear-gradient(135deg, ${primary}, rgba(5,7,17,0.96))`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 18,
          width: '72%',
          height: isBanner ? 44 : 34,
          borderRadius: 1.5,
          border: `1px solid ${accent}88`,
          background: `linear-gradient(115deg, ${primary}, ${secondary})`,
          boxShadow: `0 0 22px ${accent}55`,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          width: 54,
          height: 54,
          placeItems: 'center',
          border: `3px solid ${isTitle ? secondary : accent}`,
          borderRadius: '50%',
          bgcolor: 'rgba(5,7,17,0.76)',
          boxShadow: `0 0 24px ${accent}66`,
          color: accent,
          fontWeight: 950,
        }}
      >
        {item?.name?.slice(0, 1) || 'P'}
      </Box>
      <Chip
        label={isTitle ? item?.name : 'Collector'}
        size="small"
        sx={{
          position: 'absolute',
          bottom: 14,
          borderColor: `${accent}88`,
          bgcolor: 'rgba(5,7,17,0.72)',
          color: '#fff',
          fontWeight: 900,
        }}
        variant="outlined"
      />
      <Typography
        aria-hidden="true"
        sx={{
          position: 'absolute',
          right: 10,
          top: 8,
          color: `${accent}99`,
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {item?.equipSlot || 'profile'}
      </Typography>
    </Box>
  );
}
