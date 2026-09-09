import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/apiClient';

const INITIAL_STATE = {
  totalProjects: 0,
  estimationsDone: 0,
  activities: [],
};

const DashboardActivityContext = createContext(null);

/**
 * App-wide dashboard counters and activity feed, updated as the user moves
 * through the New project → Processing → Brand Selection → Bill of
 * Materials flow (see the `log*` calls in those pages). Mounted once at
 * the same level as ProjectsProvider (see routes/AppRoutes.jsx) so it
 * survives navigation across the whole authenticated app, not just one
 * flow.
 *
 * Seeded on mount from GET /api/dashboard, which returns the real project
 * counts and the persisted activity_log rows. Before that fetch existed here,
 * this was purely in-memory: the counters read 0 and the feed was empty after
 * every reload, even for a user whose Projects page listed real projects, and
 * everything logged during a session was lost on refresh. The in-memory
 * `log*`/`increment*` functions are still used so the dashboard updates the
 * instant something happens rather than waiting for a refetch.
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

  // Newest entry first, each with its own id/timestamp assigned here so
  // callers just describe *what* happened.
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
