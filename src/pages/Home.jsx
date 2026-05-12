import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import StyleIcon from '@mui/icons-material/Style';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import SealedPack from '../components/SealedPack.jsx';
import { getCollection, getPackShards } from '../utils/collectionStorage.js';

const COLLECTOR_BOOSTER_COST = 1000;

function getCollectionStats(collection) {
  const uniqueCardKeys = new Set(collection.map((card) => `${card.id}-${card.isFoil ? 'foil' : 'normal'}`));
  const duplicateCards = Math.max(collection.length - uniqueCardKeys.size, 0);

  return {
    duplicateCards,
    foilCards: collection.filter((card) => card.isFoil).length,
    totalCards: collection.length,
    uniqueCards: uniqueCardKeys.size,
  };
}

function handleKeyboardActivate(event, action) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function HeroPackVisual() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: { xs: 300, sm: 330, md: 420 },
        placeItems: 'center',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: { xs: 240, md: 340 },
          height: { xs: 240, md: 340 },
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(244, 201, 93, 0.22), rgba(76, 201, 240, 0.12) 42%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: { xs: '12%', md: '8%' },
          bottom: { xs: 32, md: 42 },
          display: 'grid',
          gap: 0.7,
          transform: 'rotate(-9deg)',
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Box
            key={index}
            sx={{
              width: { xs: 118, md: 150 },
              height: { xs: 164, md: 208 },
              mt: index === 0 ? 0 : -19,
              border: '1px solid rgba(248, 247, 255, 0.14)',
              borderRadius: 2,
              background:
                index === 4
                  ? 'linear-gradient(145deg, rgba(244, 201, 93, 0.32), rgba(76, 201, 240, 0.16), rgba(5, 7, 17, 0.94))'
                  : 'linear-gradient(145deg, rgba(248, 247, 255, 0.1), rgba(5, 7, 17, 0.94))',
              boxShadow: index === 4 ? '0 0 32px rgba(244, 201, 93, 0.22)' : undefined,
            }}
          />
        ))}
      </Box>
      <Box
        sx={{
          position: 'relative',
          width: { xs: 'min(52vw, 180px)', sm: 230, md: 260 },
          height: { xs: 'min(84vw, 290px)', sm: 370, md: 414 },
          transform: 'rotate(5deg)',
          filter: 'drop-shadow(0 32px 42px rgba(0, 0, 0, 0.48))',
        }}
      >
        <SealedPack boosterLabel="PLAY BOOSTER" setCode="MTG" setName="Magic Pack Opener" />
      </Box>
    </Box>
  );
}

function HomeStatCard({ helper, icon, label, value, tone = 'primary' }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderColor: 'var(--panel-border)',
        background:
          tone === 'warning'
            ? 'radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--accent-color) 18%, transparent), transparent 18rem), var(--panel-bg)'
            : 'radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--secondary-accent) 14%, transparent), transparent 18rem), var(--panel-bg)',
      }}
    >
      <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 2 }}>
        <Box
          sx={{
            display: 'grid',
            flex: '0 0 auto',
            width: 42,
            height: 42,
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: 'rgba(5, 7, 17, 0.58)',
            color: tone === 'warning' ? 'var(--text-accent)' : 'var(--secondary-accent)',
            boxShadow: '0 0 24px var(--primary-glow)',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
            {label}
          </Typography>
          <Typography fontWeight={950} sx={{ color: 'var(--text-accent)', fontSize: 26, lineHeight: 1.05 }}>
            {value.toLocaleString()}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
            {helper}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function MiniVisual({ icon, tone = 'primary' }) {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        height: { xs: 76, sm: 92 },
        mb: 1.5,
        overflow: 'hidden',
        placeItems: 'center',
        border: '1px solid var(--panel-border)',
        borderRadius: 2,
        background:
          tone === 'warning'
            ? 'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent-color) 28%, transparent), transparent 56%), var(--panel-bg)'
            : 'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--secondary-accent) 24%, transparent), transparent 56%), var(--panel-bg)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.24) 0 1px, transparent 2px), radial-gradient(circle at 74% 66%, var(--particle-color) 0 1px, transparent 2px)',
          opacity: 0.42,
        }}
      />
      <Box
        sx={{
          display: 'grid',
          width: 54,
          height: 54,
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: 'rgba(5, 7, 17, 0.58)',
          color: tone === 'warning' ? 'var(--text-accent)' : 'var(--secondary-accent)',
          boxShadow: '0 0 34px var(--primary-glow)',
        }}
      >
        {icon}
      </Box>
    </Box>
  );
}

function HomeActionCard({ actionLabel, ariaLabel, body, children, icon, onClick, title, tone }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || title}
      onClick={onClick}
      onKeyDown={(event) => handleKeyboardActivate(event, onClick)}
      sx={{
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: { xs: 3, sm: 3.5 },
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover, &:focus-visible': {
          borderColor: 'color-mix(in srgb, var(--accent-color) 58%, transparent)',
          boxShadow: '0 0 38px var(--primary-glow)',
          outline: 'none',
          transform: 'translateY(-4px)',
        },
      }}
    >
      <CardActionArea component="div" sx={{ width: '100%', height: '100%', alignItems: 'stretch' }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: '100%',
            gap: { xs: 1, sm: 1.2 },
            p: { xs: 2, sm: 2.25 },
          }}
        >
          <MiniVisual icon={icon} tone={tone} />
          <Typography variant="h5" sx={{ fontSize: { xs: 20, sm: 24 } }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 14, sm: 16 } }}>
            {body}
          </Typography>
          {children}
          <Button
            endIcon={<KeyboardArrowRightIcon />}
            size="small"
            sx={{
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              mt: 'auto',
              maxWidth: '100%',
              width: { xs: '100%', sm: 'auto' },
              whiteSpace: 'normal',
              textAlign: 'center',
            }}
            variant={tone === 'warning' ? 'contained' : 'outlined'}
          >
            {actionLabel}
          </Button>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function RecommendedAction({ hasCollectorBooster, hasCollection, navigate }) {
  const message = hasCollectorBooster
    ? 'You have enough shards for a Collector Booster.'
    : hasCollection
      ? 'Keep opening packs to earn shards from duplicates.'
      : 'Start by opening your first pack.';
  const buttonLabel = hasCollectorBooster ? 'Open Collector Booster' : hasCollection ? 'Open Packs' : 'Browse Sets';

  return (
    <Card sx={{ mb: 4, borderColor: 'var(--panel-border)' }}>
      <CardContent
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          p: { xs: 2, sm: 3 },
          background:
            'radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--accent-color) 16%, transparent), transparent 22rem), var(--panel-bg)',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={950} sx={{ color: 'var(--text-accent)' }}>
            Recommended next action
          </Typography>
          <Typography color="text.secondary">{message}</Typography>
        </Box>
        <Button
          onClick={() => navigate('/sets')}
          startIcon={hasCollectorBooster ? <LocalAtmIcon /> : <AutoAwesomeIcon />}
          variant="contained"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function HowItWorksStep({ icon, label, onClick, text }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => handleKeyboardActivate(event, onClick)}
      sx={{
        minWidth: { xs: 210, sm: 0 },
        height: '100%',
        cursor: 'pointer',
        '&:hover, &:focus-visible': {
          borderColor: 'color-mix(in srgb, var(--secondary-accent) 34%, transparent)',
          outline: 'none',
        },
      }}
    >
      <CardContent sx={{ display: 'grid', gap: 1, p: 1.75 }}>
        <Box sx={{ color: 'var(--text-accent)' }}>{icon}</Box>
        <Typography fontWeight={950}>{label}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
          {text}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const collection = getCollection();
  const packShards = getPackShards();
  const stats = getCollectionStats(collection);
  const collectorProgress = Math.min(packShards / COLLECTOR_BOOSTER_COST, 1);
  const hasCollectorBooster = packShards >= COLLECTOR_BOOSTER_COST;

  const cards = [
    {
      title: 'Choose a set',
      body: 'Browse real Magic expansion and core sets loaded from Scryfall.',
      actionLabel: 'Browse Sets',
      icon: <StyleIcon fontSize="large" />,
      onClick: () => navigate('/sets'),
    },
    {
      title: 'Open a pack',
      body: 'Pick a set, choose a booster, and reveal cards one at a time.',
      actionLabel: 'Start Opening',
      icon: <AutoAwesomeIcon fontSize="large" />,
      onClick: () => navigate('/sets'),
      tone: 'warning',
    },
    {
      title: 'Build collection',
      body: 'Save pulls locally, then search, filter, and inspect your cards.',
      actionLabel: 'View Collection',
      icon: <CollectionsBookmarkIcon fontSize="large" />,
      onClick: () => navigate('/collection'),
      extra: stats.totalCards
        ? `${stats.totalCards.toLocaleString()} saved, ${stats.foilCards.toLocaleString()} foils, ${stats.duplicateCards.toLocaleString()} duplicates`
        : 'No cards saved yet.',
    },
    {
      title: 'Earn Pack Shards',
      body: hasCollectorBooster
        ? 'Collector Booster Ready. Spend shards on a mostly foil opening.'
        : 'Duplicates grant 100 Pack Shards. Spend 1000 shards on Collector Boosters.',
      actionLabel: hasCollectorBooster ? 'Open Collector Booster' : 'Earn Shards',
      icon: <LocalAtmIcon fontSize="large" />,
      onClick: () => navigate(hasCollectorBooster ? '/sets' : stats.totalCards ? '/collection' : '/sets'),
      tone: 'warning',
      shardCard: true,
    },
  ];

  const flowSteps = [
    { label: 'Choose Set', text: 'Start from real set data.', icon: <StyleIcon />, onClick: () => navigate('/sets') },
    { label: 'Select Booster', text: 'Spin the pack carousel.', icon: <ViewCarouselIcon />, onClick: () => navigate('/sets') },
    { label: 'Tear Pack', text: 'Cut the wrapper open.', icon: <WhatshotIcon />, onClick: () => navigate('/sets') },
    { label: 'Reveal Cards', text: 'Flip through every pull.', icon: <AutoAwesomeIcon />, onClick: () => navigate('/sets') },
    { label: 'Save Pulls', text: 'Build your collection.', icon: <SaveAltIcon />, onClick: () => navigate('/collection') },
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        maxWidth: '100%',
        overflowX: 'clip',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: '-40px -16px auto', md: '-48px -32px auto' },
          height: 520,
          zIndex: -1,
          background:
            'radial-gradient(circle at 12% 20%, var(--primary-glow), transparent 24rem), radial-gradient(circle at 88% 16%, color-mix(in srgb, var(--accent-color) 16%, transparent), transparent 22rem)',
          pointerEvents: 'none',
        },
      }}
    >
      <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center" sx={{ mb: { xs: 4, md: 5 }, width: '100%' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Chip color="warning" label="MTG Pack Opener" sx={{ mb: 2, fontWeight: 900 }} variant="outlined" />
          <Typography variant="h1" sx={{ maxWidth: 740, fontSize: { xs: 42, md: 64 }, lineHeight: 0.96, mb: 2 }}>
            Open Magic packs. Build your collection.
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 680, fontSize: { xs: 17, md: 20 }, mb: 3 }}>
            Choose real MTG sets, spin through sealed boosters, tear packs open, reveal foils, and save your pulls locally.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button component={Link} to="/sets" size="large" variant="contained" startIcon={<AutoAwesomeIcon />} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Open Packs
            </Button>
            <Button component={Link} to="/collection" size="large" variant="outlined" startIcon={<CollectionsBookmarkIcon />} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              View Collection
            </Button>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <HeroPackVisual />
        </Grid>
      </Grid>

      <RecommendedAction
        hasCollectorBooster={hasCollectorBooster}
        hasCollection={stats.totalCards > 0}
        navigate={navigate}
      />

      <Grid container spacing={1.5} sx={{ mb: 4, width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HomeStatCard icon={<CollectionsBookmarkIcon />} label="Cards Saved" value={stats.totalCards} helper="Local collection" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HomeStatCard icon={<AutoAwesomeIcon />} label="Foils Pulled" value={stats.foilCards} helper="Special pulls" tone="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HomeStatCard icon={<StyleIcon />} label="Unique Cards" value={stats.uniqueCards} helper={stats.duplicateCards ? `${stats.duplicateCards} duplicates` : 'No duplicates'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HomeStatCard icon={<LocalAtmIcon />} label="Pack Shards" value={packShards} helper="Currency balance" tone="warning" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
        {cards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, md: card.shardCard ? 12 : 4 }}>
            <HomeActionCard
              actionLabel={card.actionLabel}
              body={card.body}
              icon={card.icon}
              onClick={card.onClick}
              title={card.title}
              tone={card.tone}
            >
              {card.extra && (
                <Chip
                  label={card.extra}
                  sx={{
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                    height: 'auto',
                    '& .MuiChip-label': {
                      display: 'block',
                      overflow: 'hidden',
                      py: 0.75,
                      textOverflow: 'ellipsis',
                    },
                  }}
                  variant="outlined"
                />
              )}
              {card.shardCard && (
                <Box
                  sx={{
                    display: 'grid',
                    minWidth: 0,
                    maxWidth: '100%',
                    gap: { xs: 1, sm: 1.25 },
                    p: { xs: 1.25, sm: 1.5 },
                    overflow: 'hidden',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 2,
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 13%, transparent), color-mix(in srgb, var(--secondary-accent) 10%, transparent), color-mix(in srgb, var(--app-bg) 52%, transparent))',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 0, fontSize: { xs: 12, sm: 13 }, fontWeight: 800, lineHeight: 1.25 }}>
                      {packShards.toLocaleString()} / {COLLECTOR_BOOSTER_COST.toLocaleString()} Pack Shards
                    </Typography>
                    <Typography color="warning.main" sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 900, lineHeight: 1.25 }}>
                      {Math.round(collectorProgress * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    color="warning"
                    value={collectorProgress * 100}
                    variant="determinate"
                    sx={{ width: '100%', height: { xs: 9, sm: 11 }, borderRadius: 999, bgcolor: 'rgba(248, 247, 255, 0.08)' }}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: '100%', overflow: 'hidden' }}>
                    <Chip
                      color={hasCollectorBooster ? 'success' : 'warning'}
                      label={hasCollectorBooster ? 'Collector Booster Ready' : 'Collector Booster unlocks at 1,000'}
                      size="small"
                      sx={{
                        maxWidth: '100%',
                        height: 'auto',
                        '& .MuiChip-label': {
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          lineHeight: 1.2,
                          py: 0.5,
                          fontSize: { xs: 11, sm: 12 },
                        },
                      }}
                    />
                    <Chip
                      color="secondary"
                      label="Duplicates grant 100"
                      size="small"
                      variant="outlined"
                      sx={{
                        maxWidth: '100%',
                        height: 'auto',
                        '& .MuiChip-label': {
                          whiteSpace: 'normal',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          lineHeight: 1.2,
                          py: 0.5,
                          fontSize: { xs: 11, sm: 12 },
                        },
                      }}
                    />
                  </Box>
                </Box>
              )}
            </HomeActionCard>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            How it works
          </Typography>
          <Stack
            direction={{ xs: 'row', md: 'row' }}
            gap={1.5}
            sx={{ overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 1, md: 0 } }}
          >
            {flowSteps.map((step) => (
              <Box key={step.label} sx={{ flex: { xs: '0 0 auto', md: 1 } }}>
                <HowItWorksStep {...step} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

    </Box>
  );
}
