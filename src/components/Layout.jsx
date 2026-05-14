import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import GroupIcon from '@mui/icons-material/Group';
import HomeIcon from '@mui/icons-material/Home';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import StorefrontIcon from '@mui/icons-material/Storefront';
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
import { useAuth } from '../context/AuthContext.jsx';
import { useCosmetics } from '../context/CosmeticsContext.jsx';
import { getThemeVariables } from '../theme/cosmeticThemes.js';
import { subscribeToPackShardWallet, syncPackShardsFromCloud } from '../api/packShards.js';
import { getPackShards } from '../utils/collectionStorage.js';
import LocalCollectionMigrationDialog from './LocalCollectionMigrationDialog.jsx';

const navItems = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Open Packs', path: '/sets', icon: <AutoAwesomeIcon /> },
  { label: 'Collection', path: '/collection', icon: <CollectionsBookmarkIcon /> },
  { label: 'Shop', path: '/shop', icon: <StorefrontIcon /> },
  { label: 'Binders', path: '/binders', icon: <Inventory2Icon /> },
  { label: 'Battle', path: '/battle', icon: <SportsEsportsIcon /> },
  { label: 'Showcase', path: '/showcase', icon: <ViewCarouselIcon /> },
  { label: 'Friends', path: '/friends', icon: <GroupIcon /> },
  { label: 'Trades', path: '/trades', icon: <SwapHorizIcon /> },
];

const loggedOutNavItems = [
  { label: 'Home', path: '/', icon: <HomeIcon /> },
  { label: 'Open Packs', path: '/sets', icon: <AutoAwesomeIcon /> },
  { label: 'Collection', path: '/collection', icon: <CollectionsBookmarkIcon /> },
  { label: 'Login', path: '/login', icon: <LoginIcon /> },
  { label: 'Sign Up', path: '/signup', icon: <StyleIcon /> },
];

export default function Layout() {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const { profile, signOut, user } = useAuth();
  const { getEquippedItem } = useCosmetics();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [packShards, setPackShards] = useState(() => getPackShards());
  const { pathname } = useLocation();
  const isPackReveal = pathname.startsWith('/open/');
  const equippedTheme = getEquippedItem('appTheme');
  const equippedTitleBadge = getEquippedItem('titleBadge');
  const themeVariables = getThemeVariables(equippedTheme?.id);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeWallet = null;

    function refreshPackShards() {
      setPackShards(getPackShards());
    }

    async function syncLoggedInWallet() {
      if (!user) {
        refreshPackShards();
        return;
      }

      try {
        const cloudBalance = await syncPackShardsFromCloud({ migrateLocal: true });

        if (isMounted) {
          setPackShards(cloudBalance);
        }

        unsubscribeWallet = await subscribeToPackShardWallet((nextBalance) => {
          if (isMounted) {
            setPackShards(nextBalance);
          }
        });
      } catch {
        refreshPackShards();
      }
    }

    syncLoggedInWallet();
    window.addEventListener('packShardsUpdated', refreshPackShards);
    window.addEventListener('storage', refreshPackShards);

    return () => {
      isMounted = false;
      window.removeEventListener('packShardsUpdated', refreshPackShards);
      window.removeEventListener('storage', refreshPackShards);
      unsubscribeWallet?.();
    };
  }, [user?.id]);

  const visibleNavItems = user ? navItems : loggedOutNavItems;
  const navLinks = visibleNavItems.map((item) => (
    <Button
      key={item.path}
      color="inherit"
      component={NavLink}
      startIcon={item.icon}
      to={item.path}
      sx={{
        color: 'text.secondary',
        '&.active': { color: 'var(--text-accent)' },
        '&:hover': {
          color: 'var(--secondary-accent)',
          boxShadow: '0 0 16px var(--primary-glow)',
        },
      }}
    >
      {item.label}
    </Button>
  ));

  async function handleSignOut() {
    await signOut();
  }

  return (
    <Box
      className={equippedTheme?.cssClass || ''}
      sx={{
        ...themeVariables,
        minHeight: '100vh',
        bgcolor: 'var(--app-bg)',
        background:
          'radial-gradient(circle at 12% 0%, var(--primary-glow), transparent 28rem), radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--particle-color) 58%, transparent), transparent 24rem), var(--app-bg)',
        transition: 'background-color 180ms ease, background 180ms ease',
      }}
    >
      {!isPackReveal && (
      <AppBar
        position="sticky"
        sx={{
          backgroundImage:
            'linear-gradient(90deg, color-mix(in srgb, var(--app-bg) 94%, transparent), color-mix(in srgb, var(--secondary-accent) 18%, var(--app-bg)))',
          borderBottom: '1px solid var(--panel-border)',
          boxShadow: '0 0 24px var(--primary-glow)',
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minWidth: 0, px: { xs: 1.5, sm: 3 } }}>
          <StyleIcon sx={{ color: 'var(--text-accent)' }} />
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

          {!isMobile && user && (
            <Chip
              color="warning"
              label={`${packShards.toLocaleString()} shards`}
              size="small"
              sx={{ fontWeight: 900 }}
              variant="outlined"
            />
          )}

          {!isMobile && user && (
            <Chip
              color="secondary"
              label={
                equippedTitleBadge
                  ? `${profile?.display_name || profile?.username || 'Signed in'} - ${equippedTitleBadge.name}`
                  : profile?.display_name || profile?.username || 'Signed in'
              }
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {navLinks}
              {user && (
                <Button color="inherit" onClick={handleSignOut} sx={{ color: 'text.secondary' }}>
                  Sign Out
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      )}

      {!isPackReveal && (
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2, bgcolor: 'var(--app-bg)', minHeight: '100%' }} role="navigation" onClick={() => setIsDrawerOpen(false)}>
          <List>
            {user && (
            <ListItemButton>
                <ListItemIcon sx={{ color: 'var(--text-accent)' }}>
                <AutoAwesomeIcon />
              </ListItemIcon>
              <ListItemText primary={`${packShards.toLocaleString()} pack shards`} />
            </ListItemButton>
            )}
            {user && (
              <ListItemButton>
                <ListItemIcon sx={{ color: 'var(--secondary-accent)' }}>
                  <StyleIcon />
                </ListItemIcon>
                <ListItemText
                  primary={profile?.display_name || profile?.username || 'Signed in'}
                  secondary={equippedTitleBadge?.name}
                />
              </ListItemButton>
            )}
            {visibleNavItems.map((item) => (
              <ListItemButton key={item.path} component={NavLink} to={item.path}>
                <ListItemIcon sx={{ color: 'var(--secondary-accent)' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            {user && (
              <ListItemButton onClick={handleSignOut}>
                <ListItemIcon sx={{ color: 'var(--secondary-accent)' }}>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            )}
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

      {!isPackReveal && <LocalCollectionMigrationDialog />}
    </Box>
  );
}
