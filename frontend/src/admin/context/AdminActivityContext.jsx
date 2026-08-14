import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AdminActivityContext = createContext(null);

/**
 * The Admin Dashboard's "Recent system activity" feed. Starts empty — no
 * seeded/fake entries — and fills in as the admin actually manages users,
 * stores, and materials during this session (see the `logActivity` calls in
 * AdminUsersPage/AdminStoresPage/AdminMaterialsPage/AdminSettingsPage).
 * Same shape/pattern as DashboardActivityContext on the User side.
 */
export function AdminActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);

  const logActivity = useCallback((entry) => {
    setActivities((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date(), ...entry },
      ...prev,
    ]);
  }, []);

  const value = useMemo(() => ({ activities, logActivity }), [activities, logActivity]);

  return <AdminActivityContext.Provider value={value}>{children}</AdminActivityContext.Provider>;
}

export function useAdminActivity() {
  const context = useContext(AdminActivityContext);
  if (!context) {
    throw new Error('useAdminActivity must be used within an AdminActivityProvider');
  }
  return context;
}
