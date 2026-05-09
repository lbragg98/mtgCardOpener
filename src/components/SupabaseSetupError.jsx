import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { supabaseConfigError } from '../lib/supabaseClient.js';

export default function SupabaseSetupError() {
  return (
    <Box sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center', bgcolor: '#03050d', px: 2 }}>
      <Card sx={{ maxWidth: 620, borderColor: 'rgba(244, 201, 93, 0.32)' }}>
        <CardContent sx={{ display: 'grid', gap: 2, p: { xs: 3, md: 4 } }}>
          <Typography color="warning.main" fontWeight={950}>
            Setup Needed
          </Typography>
          <Typography variant="h4">Supabase environment variables are missing</Typography>
          <Alert severity="error" variant="outlined">
            {supabaseConfigError}
          </Alert>
          <Typography color="text.secondary">
            In Vercel, add exactly: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
