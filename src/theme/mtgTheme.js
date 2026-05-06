import { createTheme } from '@mui/material/styles';

export const mtgTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#050711',
      paper: '#101426',
    },
    primary: {
      main: '#8f7cff',
      light: '#b8a9ff',
      dark: '#5c47c9',
    },
    secondary: {
      main: '#4cc9f0',
      light: '#8fe5ff',
      dark: '#168aad',
    },
    warning: {
      main: '#f4c95d',
    },
    text: {
      primary: '#f8f7ff',
      secondary: '#b9bfd8',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(90deg, rgba(5,7,17,0.96), rgba(16,20,38,0.94))',
          borderBottom: '1px solid rgba(143, 124, 255, 0.24)',
          boxShadow: '0 0 24px rgba(76, 201, 240, 0.12)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(16,20,38,0.98), rgba(10,13,28,0.98))',
          border: '1px solid rgba(185, 191, 216, 0.12)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.28)',
          transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
          '&:hover': {
            borderColor: 'rgba(244, 201, 93, 0.48)',
            boxShadow: '0 0 28px rgba(143, 124, 255, 0.18), 0 16px 42px rgba(0, 0, 0, 0.36)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
  },
});
