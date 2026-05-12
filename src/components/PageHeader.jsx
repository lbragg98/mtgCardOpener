import { Box, Typography } from '@mui/material';

export default function PageHeader({ eyebrow, title, children }) {
  return (
    <Box sx={{ mb: 4, maxWidth: 760 }}>
      <Typography fontWeight={800} gutterBottom sx={{ color: 'var(--text-accent)' }}>
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h1" sx={{ mb: 1, fontSize: { xs: 34, md: 48 } }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Box>
  );
}
