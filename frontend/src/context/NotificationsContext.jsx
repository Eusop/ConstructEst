import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { NOTIFICATIONS_SEED } from '../features/notifications/data/notificationsMock';

const NotificationsContext = createContext(null);

/**
 * App-wide notification feed. Frontend-only for now (seeded from mock data,
 * kept in memory) — a real backend would swap the seed for a fetch and these
 * actions for API calls, without call sites changing. Mounted alongside
 * DashboardActivityProvider/ProjectsProvider (see routes/AppRoutes.jsx) so
 * the Sidebar and header bell can both read `unreadCount` for their badges,
 * not just the Notifications page itself.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS_SEED);

  // Called from wherever a real user action happens (NewProjectPage,
  // ProjectProcessingPage, StoreLocatorPage, BrandSelectionPage,
  // BillOfMaterialsPage, ProfilePage, SettingsPage) — assigns the
  // id/timestamp/read state here so callers just describe *what* happened,
  // the same division of responsibility DashboardActivityContext's
  // `logActivity` already uses. Newest-first: a fresh notification is
  // prepended, not appended.
  const addNotification = useCallback(({ type, title, description }) => {
    setNotifications((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, title, description, timestamp: new Date(), read: false },
      ...prev,
    ]);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const value = useMemo(
    () => ({ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
