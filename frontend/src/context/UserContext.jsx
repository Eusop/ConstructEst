import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, isLoggedIn, logout as logoutRequest } from '../services/authService';

const UserContext = createContext(null);

const INITIAL_PROFILE = { id: null, userName: null, username: null, email: null, avatarUrl: null };

/**
 * The signed-in user's identity. `userName` is set once on successful
 * sign-up/sign-in (see SignUpForm/LoginForm) and read wherever the app
 * greets the user (see WelcomeBanner). `username`/`email` are additionally
 * captured at sign-up for the Profile page to display/edit; `avatarUrl` is
 * only ever set from the Profile page itself. Mounted above the
 * dashboard's own providers in App.jsx since it needs to survive
 * navigating from /login or /signup into the authenticated app.
 *
 * Backed by the real backend now (see services/authService.js): on mount,
 * if a token is already stored (a returning "keep me signed in" session),
 * it's validated against GET /auth/me and the profile rehydrated —
 * otherwise the token is stale and gets cleared.
 */
export function UserProvider({ children }) {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(() => isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn()) return;
    fetchCurrentUser()
      .then((user) => {
        setProfile({ id: user.id, userName: user.userName, username: user.username, email: user.email, avatarUrl: user.avatarUrl });
        setIsAuthenticated(true);
      })
      .catch(() => {
        logoutRequest();
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrentUser = useCallback((name) => {
    setProfile((prev) => ({ ...prev, userName: name }));
    setIsAuthenticated(true);
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => {
      // The avatar is an object URL (see ProfileAvatarSection) shared
      // across the app (header avatar + Profile page) rather than owned by
      // any one component, so its lifecycle is managed here: once it's
      // replaced by a different value, the outgoing URL is genuinely
      // unreferenced anywhere and safe to revoke.
      if ('avatarUrl' in updates && prev.avatarUrl && prev.avatarUrl !== updates.avatarUrl && prev.avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.avatarUrl);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setProfile(INITIAL_PROFILE);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ ...profile, isAuthenticated, isLoading, setCurrentUser, updateProfile, logout }),
    [profile, isAuthenticated, isLoading, setCurrentUser, updateProfile, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
