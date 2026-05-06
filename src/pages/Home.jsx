import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

const featureCards = [
  {
    title: 'Choose a set',
    body: 'Start from mock Magic sets while the Scryfall layer waits for the next step.',
  },
  {
    title: 'Open a pack',
    body: 'Pack opening is stubbed with placeholder slots so the flow is ready to expand.',
  },
  {
    title: 'Build collection',
    body: 'LocalStorage helpers are ready for keeping cards on this device.',
  },
];

export default function Home() {
  return (
    <Box>
      <PageHeader eyebrow="Prototype" title="Open packs in a moody little MTG lab.">
        A Vite, React Router, and Material UI foundation for a Magic: The Gathering pack opening
        simulator.
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

      <Alert severity="info" sx={{ mb: 4 }}>
        Scryfall integration and real pack generation are intentionally left out for this first step.
      </Alert>

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
