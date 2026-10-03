import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, isLoggedIn, logout as logoutRequest } from '../services/authService';
import { resolveAssetUrl } from '../services/apiClient';
import { sendHeartbeat } from '../services/usersService';

const UserContext = createContext(null);
const INITIAL_PROFILE = { id: null, userName: null, userId: null, email: null, avatarUrl: null, accessRole: null, mustChangePassword: false };

// Feeds the admin "online now" dot (AdminUsersPage.jsx counts last_seen_at
// within ~90s, double this, as online).
const HEARTBEAT_INTERVAL_MS = 45_000;

/**
 * The signed-in user's identity. `userName` is set on sign-up or sign-in and
 * read where the app greets the user (WelcomeCard). `userId` and `email`
 * are for the Profile page. `avatarUrl` is only set from the Profile page.
 * Mounted above the dashboard providers in App.jsx so it survives moving from
 * /login into the app.
 *
 * On mount, if a token is stored ("keep me signed in"), it is checked against
 * GET /auth/me and the profile is restored; a stale token is cleared.
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
          userId: user.userId,
          email: user.email,
          avatarUrl: resolveAssetUrl(user.avatarUrl),
          accessRole: user.accessRole,
          mustChangePassword: Boolean(user.mustChangePassword),
        });
        setIsAuthenticated(true);
      })
      .catch((error) => {
        // Only a 401 means the token is bad. Network errors or a cold backend
        // should not log the user out, so the token is kept.
        if (error?.status === 401) {
          logoutRequest();
        }
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Runs right after login, then every 45s. Errors are ignored: a missed
  // beat only makes the user look briefly offline to the admin.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    sendHeartbeat().catch(() => {});
    const intervalId = setInterval(() => {
      sendHeartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  const setCurrentUser = useCallback((name, accessRole = 'user') => {
    setProfile((prev) => ({ ...prev, userName: name, accessRole }));
    setIsAuthenticated(true);
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => {
      // Avatars are server paths now, so this revoke rarely does anything. The
      // only object URLs left are local previews in ProfileAvatarSection, which
      // revokes them. Kept as a cheap guard (one string check).
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
