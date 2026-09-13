import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, isLoggedIn, logout as logoutRequest } from '../services/authService';
import { resolveAssetUrl } from '../services/apiClient';

const UserContext = createContext(null);
const INITIAL_PROFILE = { id: null, userName: null, employeeId: null, email: null, avatarUrl: null, accessRole: null };

/**
 * The signed-in user's identity. `userName` is set once on successful
 * sign-up/sign-in (see SignUpForm/LoginForm) and read wherever the app
 * greets the user (see WelcomeBanner). `employeeId`/`email` are additionally
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
        setProfile({
          id: user.id,
          userName: user.userName,
          employeeId: user.employeeId,
          email: user.email,
          avatarUrl: resolveAssetUrl(user.avatarUrl),
          accessRole: user.accessRole,
        });
        setIsAuthenticated(true);
      })
      .catch((error) => {
        // requireAuth (backend/src/middleware/auth.js) always answers 401 for
        // a missing/invalid/expired token — that's the only case that means
        // the stored token is actually bad. Anything else (a transient
        // network error, a cold-starting backend, a CORS hiccup) used to hit
        // this same catch and wipe an otherwise still-valid token, silently
        // logging out someone who checked "Keep me signed in" the moment
        // they reopened the tab. Leave the token alone for those — the user
        // just stays logged out for this load and can retry/refresh.
        if (error?.status === 401) {
          logoutRequest();
        }
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrentUser = useCallback((name, accessRole = 'user') => {
    setProfile((prev) => ({ ...prev, userName: name, accessRole }));
    setIsAuthenticated(true);
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => {
      // Avatars are server paths now (/uploads/avatars/...), uploaded via
      // POST /users/me/avatar, so this revoke no longer has anything to do in
      // practice: the only object URLs left are the local previews inside
      // ProfileAvatarSection, which never reach this context and are revoked
      // there. Kept as a cheap guard in case any other code path ever hands
      // an object URL to updateProfile again — it costs one string check.
      if ('avatarUrl' in updates && prev.avatarUrl && prev.avatarUrl !== updates.avatarUrl && prev.avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.avatarUrl);
      }
      if ('avatarUrl' in updates) {
        updates = { ...updates, avatarUrl: resolveAssetUrl(updates.avatarUrl) };
      }

      return { ...prev, ...updates };
    });
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setProfile(INITIAL_PROFILE);
    setIsAuthenticated(false);
  }, []);

  const isAdmin = profile.accessRole === 'admin';

  const value = useMemo(
    () => ({ ...profile, isAdmin, isAuthenticated, isLoading, setCurrentUser, updateProfile, logout }),
    [profile, isAdmin, isAuthenticated, isLoading, setCurrentUser, updateProfile, logout],
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
