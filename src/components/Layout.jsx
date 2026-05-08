import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import StyleIcon from '@mui/icons-material/Style';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getPackShards } from '../utils/collectionStorage.js';

const navItems = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Open Packs', path: '/sets', icon: <AutoAwesomeIcon /> },
  { label: 'Collection', path: '/collection', icon: <CollectionsBookmarkIcon /> },
];

export default function Layout() {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [packShards, setPackShards] = useState(() => getPackShards());
  const { pathname } = useLocation();
  const isPackReveal = pathname.startsWith('/open/');

  useEffect(() => {
    function refreshPackShards() {
      setPackShards(getPackShards());
    }

    window.addEventListener('packShardsUpdated', refreshPackShards);
    window.addEventListener('storage', refreshPackShards);

    return () => {
      window.removeEventListener('packShardsUpdated', refreshPackShards);
      window.removeEventListener('storage', refreshPackShards);
    };
  }, []);

  const navLinks = navItems.map((item) => (
    <Button
      key={item.path}
      color="inherit"
      component={NavLink}
      startIcon={item.icon}
      to={item.path}
      sx={{
        color: 'text.secondary',
        '&.active': { color: 'warning.main' },
        '&:hover': { color: 'primary.light', boxShadow: '0 0 16px rgba(143, 124, 255, 0.16)' },
      }}
    >
      {item.label}
    </Button>
  ));

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {!isPackReveal && (
      <AppBar position="sticky">
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minWidth: 0, px: { xs: 1.5, sm: 3 } }}>
          <StyleIcon color="warning" />
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 800,
              fontSize: { xs: 18, sm: 20 },
            }}
          >
            MTG Pack Opener
          </Typography>

          {!isMobile && (
            <Chip
              color="warning"
              label={`${packShards.toLocaleString()} shards`}
              size="small"
              sx={{ fontWeight: 900 }}
              variant="outlined"
            />
          )}

          {isMobile ? (
            <IconButton
              aria-label="Open navigation"
              color="inherit"
              edge="end"
              onClick={() => setIsDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>{navLinks}</Box>
          )}
        </Toolbar>
      </AppBar>
      )}

      {!isPackReveal && (
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="navigation" onClick={() => setIsDrawerOpen(false)}>
          <List>
            <ListItemButton>
              <ListItemIcon sx={{ color: 'warning.main' }}>
                <AutoAwesomeIcon />
              </ListItemIcon>
              <ListItemText primary={`${packShards.toLocaleString()} pack shards`} />
            </ListItemButton>
            {navItems.map((item) => (
              <ListItemButton key={item.path} component={NavLink} to={item.path}>
                <ListItemIcon sx={{ color: 'primary.light' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      )}

      <Container
        disableGutters={isPackReveal}
        maxWidth={isPackReveal ? false : 'lg'}
        sx={{ py: isPackReveal ? 0 : { xs: 4, md: 6 } }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}
