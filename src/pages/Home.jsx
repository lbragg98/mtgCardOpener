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
import PageHeader from '../components/PageHeader.jsx';
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

function MiniVisual({ icon, tone = 'primary' }) {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        height: 96,
        mb: 2,
        overflow: 'hidden',
        placeItems: 'center',
        border: '1px solid rgba(248, 247, 255, 0.12)',
        borderRadius: 2,
        background:
          tone === 'warning'
            ? 'radial-gradient(circle at 50% 45%, rgba(244, 201, 93, 0.28), transparent 52%), linear-gradient(135deg, rgba(37, 25, 9, 0.86), rgba(10, 13, 28, 0.92))'
            : 'radial-gradient(circle at 50% 45%, rgba(76, 201, 240, 0.18), transparent 52%), linear-gradient(135deg, rgba(18, 18, 46, 0.86), rgba(6, 9, 22, 0.94))',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          width: 54,
          height: 54,
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: 'rgba(5, 7, 17, 0.58)',
          boxShadow:
            tone === 'warning'
              ? '0 0 34px rgba(244, 201, 93, 0.28)'
              : '0 0 34px rgba(76, 201, 240, 0.18)',
          color: tone === 'warning' ? 'warning.main' : 'primary.light',
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
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover, &:focus-visible': {
          borderColor: tone === 'warning' ? 'rgba(244, 201, 93, 0.56)' : 'rgba(76, 201, 240, 0.36)',
          boxShadow:
            tone === 'warning'
              ? '0 0 34px rgba(244, 201, 93, 0.16)'
              : '0 0 34px rgba(76, 201, 240, 0.12)',
          outline: 'none',
          transform: 'translateY(-3px)',
        },
      }}
    >
      <CardActionArea component="div" sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent sx={{ display: 'grid', height: '100%', gap: 1 }}>
          <MiniVisual icon={icon} tone={tone} />
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary">{body}</Typography>
          {children}
          <Button
            endIcon={<KeyboardArrowRightIcon />}
            size="small"
            sx={{ justifySelf: 'start', mt: 'auto' }}
            variant={tone === 'warning' ? 'contained' : 'outlined'}
          >
            {actionLabel}
          </Button>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function StatCard({ label, value }) {
  return (
    <Card sx={{ borderColor: 'rgba(248, 247, 255, 0.1)' }}>
      <CardContent sx={{ p: 1.5 }}>
        <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography color="warning.main" fontWeight={950}>
          {value.toLocaleString()}
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
      body: 'Duplicates grant 100 Pack Shards. Spend 1000 shards on Collector Boosters.',
      actionLabel: hasCollectorBooster ? 'Open Collector Booster' : 'Earn Shards',
      icon: <LocalAtmIcon fontSize="large" />,
      onClick: () => navigate(hasCollectorBooster ? '/sets' : stats.totalCards ? '/collection' : '/sets'),
      tone: 'warning',
      shardCard: true,
    },
  ];

  const flowSteps = [
    { label: 'Choose Set', icon: <StyleIcon />, to: '/sets' },
    { label: 'Spin Pack Carousel', icon: <ViewCarouselIcon />, to: '/sets' },
    { label: 'Tear Pack', icon: <WhatshotIcon />, to: '/sets' },
    { label: 'Reveal Cards', icon: <AutoAwesomeIcon />, to: '/sets' },
    { label: 'Save Collection', icon: <SaveAltIcon />, to: '/collection' },
  ];

  return (
    <Box>
      <PageHeader eyebrow="MTG Pack Opener" title="Open packs in a moody little MTG lab.">
        Choose a set, spin through sealed boosters, cut one open, and build a local collection from
        real Scryfall card data.
      </PageHeader>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Button component={Link} to="/sets" size="large" variant="contained" startIcon={<AutoAwesomeIcon />}>
          Open Packs
        </Button>
        <Button
          component={Link}
          to="/collection"
          size="large"
          variant="outlined"
          startIcon={<CollectionsBookmarkIcon />}
        >
          View Collection
        </Button>
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard label="Cards Saved" value={stats.totalCards} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Foils Pulled" value={stats.foilCards} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Unique Cards" value={stats.uniqueCards} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Pack Shards" value={packShards} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid key={card.title} item xs={12} md={card.shardCard ? 12 : 4}>
            <HomeActionCard
              actionLabel={card.actionLabel}
              body={card.body}
              icon={card.icon}
              onClick={card.onClick}
              title={card.title}
              tone={card.tone}
            >
              {card.extra && (
                <Chip label={card.extra} sx={{ justifySelf: 'start', maxWidth: '100%' }} variant="outlined" />
              )}
              {card.shardCard && (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
                      {packShards.toLocaleString()} / {COLLECTOR_BOOSTER_COST.toLocaleString()} Pack Shards
                    </Typography>
                    <Typography color="warning.main" sx={{ fontSize: 13, fontWeight: 900 }}>
                      {Math.round(collectorProgress * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    color="warning"
                    value={collectorProgress * 100}
                    variant="determinate"
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip color="warning" label="Duplicates grant 100 shards" size="small" />
                    <Chip color="secondary" label="Collector Booster at 1000" size="small" variant="outlined" />
                  </Stack>
                </Box>
              )}
            </HomeActionCard>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Quick Actions
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {stats.totalCards > 0 && (
              <Button component={Link} startIcon={<CollectionsBookmarkIcon />} to="/collection" variant="outlined">
                View Collection
              </Button>
            )}
            <Button component={Link} startIcon={<AutoAwesomeIcon />} to="/sets" variant="contained">
              Open Packs
            </Button>
            <Button component={Link} startIcon={<StyleIcon />} to="/sets" variant="outlined">
              Browse Sets
            </Button>
            {hasCollectorBooster && (
              <Button component={Link} color="warning" startIcon={<LocalAtmIcon />} to="/sets" variant="contained">
                Open Collector Booster
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            How it works
          </Typography>
          <Grid container spacing={1.5}>
            {flowSteps.map((step, index) => (
              <Grid key={step.label} item xs={12} sm>
                <Button
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  component={Link}
                  endIcon={index < flowSteps.length - 1 ? <KeyboardArrowRightIcon /> : undefined}
                  startIcon={step.icon}
                  to={step.to}
                  variant="outlined"
                  fullWidth
                  sx={{ justifyContent: 'flex-start', minHeight: 48 }}
                >
                  {step.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
