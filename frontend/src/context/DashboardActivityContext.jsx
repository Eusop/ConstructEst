import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/apiClient';

const INITIAL_STATE = {
  totalProjects: 0,
  estimationsDone: 0,
  activities: [],
};

const DashboardActivityContext = createContext(null);

/**
 * App-wide dashboard counters and activity feed, updated as the user goes
 * through New project, Processing, Brand Selection and Bill of Materials (see
 * the `log*` calls in those pages). Mounted next to ProjectsProvider (see
 * routes/AppRoutes.jsx) so it lasts across the whole authenticated app.
 *
 * Seeded on mount from GET /api/dashboard (project counts and saved
 * activity_log rows). The in-memory `log*`/`increment*` functions still update
 * the dashboard right away instead of waiting for a refetch.
 */
export function DashboardActivityProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/dashboard/summary')
      .then(({ totalProjects, estimationsDone, activities }) => {
        if (cancelled) return;
        setState((prev) => ({
          totalProjects,
          estimationsDone,
          // Anything logged this session stays on top of the fetched history.
          activities: [...prev.activities, ...activities.map((a) => ({ ...a, timestamp: new Date(a.timestamp) }))],
        }));
      })
      .catch(() => {
        // Leaves the zeroed initial state; the dashboard renders its own empty
        // state and nothing else depends on these numbers.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const incrementTotalProjects = useCallback(() => {
    setState((prev) => ({ ...prev, totalProjects: prev.totalProjects + 1 }));
  }, []);

  const incrementEstimationsDone = useCallback(() => {
    setState((prev) => ({ ...prev, estimationsDone: prev.estimationsDone + 1 }));
  }, []);

  // Newest first. Each entry gets its own id and timestamp here, so callers
  // only describe what happened.
  const logActivity = useCallback((entry) => {
    setState((prev) => ({
      ...prev,
      activities: [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date(), ...entry },
        ...prev.activities,
      ],
    }));
  }, []);

  const value = useMemo(
    () => ({ ...state, incrementTotalProjects, incrementEstimationsDone, logActivity }),
    [state, incrementTotalProjects, incrementEstimationsDone, logActivity],
  );

  return <DashboardActivityContext.Provider value={value}>{children}</DashboardActivityContext.Provider>;
}

export function useDashboardActivity() {
  const context = useContext(DashboardActivityContext);
  if (!context) {
    throw new Error('useDashboardActivity must be used within a DashboardActivityProvider');
  }
  return context;
}
