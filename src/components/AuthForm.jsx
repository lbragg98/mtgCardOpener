import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LoginIcon from '@mui/icons-material/Login';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizeUsername } from '../utils/authUsername.js';

export default function AuthForm({ mode = 'login' }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isSignup) {
        await signUpWithUsername(username, password, displayName);
      } else {
        await signInWithUsername(username, password);
      }

      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: 'grid', minHeight: 'calc(100vh - 180px)', placeItems: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 460, borderColor: 'rgba(244, 201, 93, 0.28)' }}>
        <CardContent sx={{ display: 'grid', gap: 2.25, p: { xs: 3, md: 4 } }}>
          <Box>
            <Typography color="warning.main" fontWeight={900} gutterBottom>
              {isSignup ? 'Create account' : 'Welcome back'}
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: 34, md: 42 } }}>
              {isSignup ? 'Sign up' : 'Log in'}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Use a username and password. No email address is needed.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              autoComplete="username"
              fullWidth
              label="Username"
              onBlur={() => setUsername(normalizeUsername(username))}
              onChange={(event) => setUsername(event.target.value)}
              value={username}
              helperText="3-20 letters, numbers, or underscores"
            />
            {isSignup && (
              <TextField
                autoComplete="name"
                fullWidth
                label="Display name"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            )}
            <TextField
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              fullWidth
              label="Password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            <Button
              disabled={isSubmitting}
              size="large"
              startIcon={isSignup ? <AutoAwesomeIcon /> : <LoginIcon />}
              type="submit"
              variant="contained"
            >
              {isSubmitting ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </Button>
          </Box>

          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
            <MuiLink component={Link} to={isSignup ? '/login' : '/signup'} underline="hover">
              {isSignup ? 'Log in' : 'Sign up'}
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
