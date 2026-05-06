import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { Box, Button, Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

const featureCards = [
  {
    title: 'Choose a set',
    body: 'Browse real Magic expansion and core sets loaded from Scryfall.',
  },
  {
    title: 'Open a pack',
    body: 'Pick a sealed booster, cut the top seal, and reveal generated cards one at a time.',
  },
  {
    title: 'Build collection',
    body: 'Opened cards save locally with foil status, duplicate counts, search, and filters.',
  },
];

export default function Home() {
  return (
    <Box>
      <PageHeader eyebrow="MTG Pack Opener" title="Open packs in a moody little MTG lab.">
        Choose a set, spin through sealed boosters, cut one open, and build a local collection from
        real Scryfall card data.
      </PageHeader>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
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
      </Box>

      <Grid container spacing={3}>
        {featureCards.map((feature) => (
          <Grid key={feature.title} item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Skeleton variant="rounded" height={88} sx={{ mb: 2, bgcolor: 'rgba(143, 124, 255, 0.14)' }} />
                <Typography variant="h5" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">{feature.body}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
