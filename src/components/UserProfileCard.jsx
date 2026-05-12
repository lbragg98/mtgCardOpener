import { Box, Chip, Typography } from '@mui/material';
import { useCosmetics } from '../context/CosmeticsContext.jsx';

const FRAME_COLORS = {
  'avatar-frame-bronze': ['#a96f32', '#e0ad68'],
  'avatar-frame-silver': ['#9fb7d6', '#f7f8ff'],
  'avatar-frame-gold': ['#c9962e', '#fff0b8'],
  'avatar-frame-galaxy': ['#3564ff', '#c069ff'],
  'avatar-frame-neon': ['#00f5ff', '#ff00c8'],
  'avatar-frame-mythic-flame': ['#b82418', '#ffba4a'],
};

const BANNER_COLORS = {
  'profile-banner-arcane-library': ['#120f2d', '#8f7cff', '#f4c95d'],
  'profile-banner-collector-vault': ['#090705', '#c9962e', '#fff0b8'],
  'profile-banner-galaxy': ['#02030c', '#3564ff', '#c069ff'],
  'profile-banner-dragonfire': ['#130604', '#b82418', '#ffba4a'],
  'profile-banner-neon-rift': ['#020308', '#00f5ff', '#ff00c8'],
};

const TITLE_COLORS = {
  'title-pack-goblin': ['#38d978', '#f4c95d'],
  'title-foil-hunter': ['#97abc5', '#f7f9ff'],
  'title-mythic-seeker': ['#8f7cff', '#f4c95d'],
  'title-shard-baron': ['#c9962e', '#fff0b8'],
  'title-binder-mage': ['#24c96d', '#b8ffcf'],
  'title-collector-supreme': ['#c9962e', '#fff0b8'],
  'title-galaxy-puller': ['#3564ff', '#c069ff'],
  'title-neon-chaser': ['#00f5ff', '#ff00c8'],
};

function getInitial(profile) {
  return (profile?.display_name || profile?.username || '?').slice(0, 1).toUpperCase();
}

export default function UserProfileCard({ actions, compact = false, profile }) {
  const { getEquippedItem } = useCosmetics();
  const avatarFrame = getEquippedItem('avatarFrame');
  const profileBanner = getEquippedItem('profileBanner');
  const titleBadge = getEquippedItem('titleBadge');
  const frameColors = FRAME_COLORS[avatarFrame?.id] || ['rgba(248,247,255,0.28)', 'rgba(248,247,255,0.62)'];
  const bannerColors = BANNER_COLORS[profileBanner?.id] || ['rgba(16,20,38,0.92)', 'rgba(143,124,255,0.18)', 'rgba(244,201,93,0.2)'];
  const titleColors = TITLE_COLORS[titleBadge?.id] || ['rgba(248,247,255,0.28)', 'rgba(248,247,255,0.68)'];

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: compact ? 1.5 : 2,
        p: compact ? 0 : 1.25,
        '&::before': {
          content: compact ? 'none' : '""',
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(circle at 16% 18%, ${bannerColors[2]}55, transparent 28%), ` +
            `linear-gradient(115deg, ${bannerColors[0]}, ${bannerColors[1]})`,
          opacity: 0.64,
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            display: 'grid',
            flex: '0 0 auto',
            width: compact ? 38 : 52,
            height: compact ? 38 : 52,
            placeItems: 'center',
            border: `2px solid ${frameColors[1]}`,
            borderRadius: '50%',
            background: `linear-gradient(145deg, rgba(5,7,17,0.92), ${frameColors[0]}66)`,
            boxShadow: `0 0 ${compact ? 14 : 24}px ${frameColors[0]}88`,
            color: frameColors[1],
            fontWeight: 950,
          }}
        >
          {getInitial(profile)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={950} noWrap>
            {profile?.display_name || 'Unknown collector'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 13 }} noWrap>
            @{profile?.username || 'unknown'}
          </Typography>
          {titleBadge && (
            <Chip
              label={titleBadge.name}
              size="small"
              sx={{
                mt: 0.75,
                maxWidth: '100%',
                borderColor: `${titleColors[1]}88`,
                bgcolor: 'rgba(5,7,17,0.62)',
                color: titleColors[1],
                fontWeight: 900,
              }}
              variant="outlined"
            />
          )}
        </Box>
      </Box>
      {actions && <Box sx={{ position: 'relative', zIndex: 1, flex: '0 0 auto' }}>{actions}</Box>}
    </Box>
  );
}
