import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { listAdminActivityLog } from '../services/adminService';
import { colors } from '../../theme/palette';

const AdminActivityContext = createContext(null);

// Maps the backend's `action` values (see admin.controller.js's
// logAdminActivity calls) onto the same icon/color trio the in-session
// entries carry, so a fetched row and a just-happened one render identically.
const ACTION_STYLES = {
  user_created: { icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  user_updated: { icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  user_verified: { icon: CheckCircleOutlineRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  user_reactivated: { icon: CheckCircleOutlineRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  user_deactivated: { icon: BlockRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
  store_created: { icon: StorefrontRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  store_updated: { icon: StorefrontRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  store_removed: { icon: DeleteOutlineRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
  store_reactivated: { icon: CheckCircleOutlineRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  store_deactivated: { icon: BlockRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
  brand_created: { icon: AddRoundedIcon, iconBg: colors.iconGreenBg, iconFg: colors.iconGreenFg },
  brand_updated: { icon: EditRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg },
  brand_deleted: { icon: DeleteOutlineRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
  // Price changes are the ones that carry a quotation file (see
  // upsertStoreMaterialPrice), so they are worth being visually distinct.
  store_price_changed: { icon: SwapHorizRoundedIcon, iconBg: colors.iconOrangeBg, iconFg: colors.iconOrangeFg },
  store_price_removed: { icon: DeleteOutlineRoundedIcon, iconBg: colors.iconRedBg, iconFg: colors.iconRedFg },
};

const DEFAULT_STYLE = { icon: CategoryRoundedIcon, iconBg: colors.iconBlueBg, iconFg: colors.iconBlueFg };

function toActivity(entry) {
  const style = ACTION_STYLES[entry.action] ?? DEFAULT_STYLE;
  return {
    id: `log-${entry.id}`,
    message: entry.message,
    timestamp: new Date(entry.createdAt),
    ...style,
  };
}

/**
 * The Admin Dashboard's "Recent system activity" feed.
 *
 * Entries come from two places. On mount it fetches the persisted
 * admin_activity_log (the same rows the Activity Log page shows), which is
 * what makes the panel meaningful right after logging in — it used to be
 * plain `useState([])` with no fetch at all, so it was blank on every load
 * and only filled while you clicked around, losing everything on refresh.
 * `logActivity` still prepends a local entry the instant an admin does
 * something, so the feed updates immediately rather than waiting for a
 * refetch; those entries and the fetched ones are shaped identically.
 */
export function AdminActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listAdminActivityLog({ limit: 20 })
      .then(({ entries }) => {
        if (cancelled) return;
        // Appended after anything already logged this session, so a just-taken
        // action stays on top even if the fetch resolves after it.
        setActivities((prev) => [...prev, ...entries.map(toActivity)]);
      })
      .catch(() => {
        // A failed fetch just leaves the feed as it was; the dashboard already
        // renders an empty state and nothing else on the page depends on it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
