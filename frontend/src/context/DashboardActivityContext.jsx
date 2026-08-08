import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
 * Frontend-only for now (plain component state, activities kept in
 * memory); swapping this for real backend activity logs later only means
 * changing what's inside this provider — call sites just read
 * `totalProjects` / `estimationsDone` / `activities` and call the
 * `log*`/`increment*` functions, same as they would against a real API.
 */
export function DashboardActivityProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

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
