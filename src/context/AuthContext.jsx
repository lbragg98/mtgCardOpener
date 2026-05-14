// AuthContext keeps Supabase session/profile state in one place for route guards and app chrome.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabaseClient.js';
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from '../utils/authUsername.js';

const AuthContext = createContext(null);

function friendlyAuthError(error, fallback = 'Authentication failed. Please try again.') {
  const message = error?.message || fallback;

  if (/invalid login credentials/i.test(message)) {
    return 'Wrong username or password.';
  }

  if (/already registered|already exists|duplicate/i.test(message)) {
    return 'Username already taken.';
  }

  if (/email.*confirm|confirm.*email|not confirmed/i.test(message)) {
    return 'Email confirmation is still enabled. Disable email confirmations in Supabase Auth settings for this username-only prototype.';
  }

  return message;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (userId = user?.id) => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return null;
    }

    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load your profile.');
    }

    setProfile(data || null);
    return data || null;
  }, [user?.id]);

  useEffect(() => {
    // Load the initial session and then keep React state synced with Supabase auth events.
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(data.session || null);
      setUser(data.session?.user || null);

      if (data.session?.user) {
        try {
          await refreshProfile(data.session.user.id);
        } catch {
          setProfile(null);
        }
      }

      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);

      if (nextSession?.user) {
        refreshProfile(nextSession.user.id).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  async function signUpWithUsername(usernameInput, password, displayNameInput) {
    // Usernames are checked in profiles before creating the hidden Supabase auth email.
    if (!isSupabaseConfigured) {
      throw new Error(supabaseConfigError);
    }

    const username = normalizeUsername(usernameInput);
    const displayName = String(displayNameInput || '').trim();

    if (!isValidUsername(username)) {
      throw new Error('Invalid username. Use 3-20 lowercase letters, numbers, or underscores.');
    }

    if (!displayName) {
      throw new Error('Display name is required.');
    }

    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileCheckError) {
      throw new Error(profileCheckError.message || 'Unable to check that username.');
    }

    if (existingProfile) {
      throw new Error('Username already taken.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: usernameToAuthEmail(username),
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw new Error(friendlyAuthError(error, 'Unable to create your account.'));
    }

    if (!data.user) {
      throw new Error('Account created, but no active session was returned. Disable email confirmation in Supabase Auth settings.');
    }

    if (!data.session) {
      throw new Error('Account created, but email confirmation is still enabled. Disable email confirmations in Supabase Auth settings for this prototype.');
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      display_name: displayName,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('Username already taken.');
      }

      throw new Error(insertError.message || 'Account created, but the profile could not be saved.');
    }

    setSession(data.session);
    setUser(data.user);
    await refreshProfile(data.user.id);

    return data;
  }

  async function signInWithUsername(usernameInput, password) {
    if (!isSupabaseConfigured) {
      throw new Error(supabaseConfigError);
    }

    const username = normalizeUsername(usernameInput);

    if (!isValidUsername(username)) {
      throw new Error('Invalid username. Use 3-20 lowercase letters, numbers, or underscores.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });

    if (error) {
      throw new Error(friendlyAuthError(error, 'Unable to sign in.'));
    }

    setSession(data.session);
    setUser(data.user);
    await refreshProfile(data.user.id);

    return data;
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message || 'Unable to sign out.');
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      isSupabaseConfigured,
      supabaseConfigError,
      signUpWithUsername,
      signInWithUsername,
      signOut,
      refreshProfile,
    }),
    [loading, profile, refreshProfile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
