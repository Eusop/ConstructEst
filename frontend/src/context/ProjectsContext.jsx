import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, ApiError } from '../services/apiClient';
import { isLoggedIn } from '../services/authService';

const INITIAL_DRAFT = {
  projectName: '',
  location: '',
  budgetCeiling: '',
  storeys: 2,
  includeRoofing: true,
  file: null,
  // Optional, 2-storey only — lets the engine use each floor's own real
  // geometry instead of scaling the ground floor's footprint by storeys
  // (see backend/engine/formulas.py's geometry2 parameter).
  secondFloorFile: null,
};

const INITIAL_FILE_VALIDATION = { status: 'idle', message: '' };

// Temporary id for a project that's mid-upload — swapped for the real
// server id once POST /api/projects resolves (see createProjectFromDraft).
function createTempId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ICON_COLORS = ['blue', 'green', 'orange', 'purple'];

const ProjectsContext = createContext(null);

function toContextProject(serverProject, extra = {}) {
  return {
    id: serverProject.id,
    projectName: serverProject.projectName,
    location: serverProject.location,
    budgetCeiling: serverProject.budgetCeiling,
    storeys: serverProject.storeys,
    includeRoofing: serverProject.includeRoofing,
    hasSecondFloorFile: serverProject.hasSecondFloorFile ?? false,
    file: null,
    fileValidation: INITIAL_FILE_VALIDATION,
    secondFloorFile: null,
    secondFloorFileValidation: INITIAL_FILE_VALIDATION,
    iconColor: ICON_COLORS[serverProject.id % ICON_COLORS.length],
    status: serverProject.status === 'parsed' ? 'Estimated' : serverProject.status === 'failed' ? 'Failed' : 'Parsing',
    selectedStoreId: serverProject.selectedStoreId,
    brandSelection: null,
    createdAt: new Date(serverProject.createdAt).getTime(),
    estimation: null,
    parseError: null,
    ...extra,
  };
}

/**
 * The app's multi-project workspace — now backed by the real backend (see
 * services/apiClient.js): the project list loads from GET /api/projects on
 * mount, `createProjectFromDraft` uploads the DXF and runs the real
 * rule-based engine, and `deleteProject` calls the real DELETE endpoint.
 * `activeProject.estimation` carries whatever GET /api/projects/:id last
 * returned — pages that need it (Results, Material Estimation, ...) fetch
 * it themselves if it's still null (e.g. after a reload) via
 * `refreshActiveProjectEstimation`, then feed it to the relevant
 * feature/data module (see e.g. features/projects/data/parsedProjectMock).
 */
export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [fileValidation, setFileValidation] = useState(INITIAL_FILE_VALIDATION);
  const [secondFloorFileValidation, setSecondFloorFileValidation] = useState(INITIAL_FILE_VALIDATION);

  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    apiRequest('/projects')
      .then(({ projects: rows }) => setProjects(rows.map((row) => toContextProject(row))))
      .catch(() => {});
  }, []);

  const updateDraft = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setFileValidation(INITIAL_FILE_VALIDATION);
    setSecondFloorFileValidation(INITIAL_FILE_VALIDATION);
  }, []);

  const updateActiveProject = useCallback((patch) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== activeProjectIdRef.current) return project;
        return { ...project, ...(typeof patch === 'function' ? patch(project) : patch) };
      }),
    );
  }, []);

  const updateProjectById = useCallback((id, patch) => {
    setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, ...patch } : project)));
  }, []);

  // Kicks off the real upload in the background — NewProjectPage doesn't
  // (and shouldn't) await this; it navigates straight to Processing, which
  // watches this project's `status` for completion instead of a fixed
  // timer (see useSimulatedParsing/ProjectProcessingPage).
  const createProjectFromDraft = useCallback(() => {
    const tempId = createTempId();
    const { projectName, location, budgetCeiling, storeys, includeRoofing, file, secondFloorFile } = draft;

    setProjects((prev) => [
      ...prev,
      {
        id: tempId,
        projectName,
        location,
        budgetCeiling,
        storeys,
        includeRoofing,
        hasSecondFloorFile: Boolean(secondFloorFile),
        file,
        fileValidation,
        secondFloorFile,
        secondFloorFileValidation,
        iconColor: ICON_COLORS[prev.length % ICON_COLORS.length],
        status: 'Parsing',
        selectedStoreId: null,
        brandSelection: null,
        createdAt: Date.now(),
        estimation: null,
        parseError: null,
      },
    ]);
    setActiveProjectId(tempId);
    setDraft(INITIAL_DRAFT);
    setFileValidation(INITIAL_FILE_VALIDATION);
    setSecondFloorFileValidation(INITIAL_FILE_VALIDATION);

    (async () => {
      try {
        const form = new FormData();
        form.append('projectName', projectName);
        form.append('location', location);
        form.append('budgetCeiling', String(budgetCeiling));
        form.append('storeys', String(storeys));
        form.append('includeRoofing', String(includeRoofing));
        form.append('dxfFile', file.rawFile, file.name);
        if (secondFloorFile) form.append('secondFloorDxfFile', secondFloorFile.rawFile, secondFloorFile.name);

        const result = await apiRequest('/projects', { method: 'POST', body: form, isMultipart: true });
        const finalId = result.project.id;

        setProjects((prev) =>
          prev.map((project) =>
            project.id === tempId
              ? toContextProject(result.project, {
                  file, fileValidation, secondFloorFile, secondFloorFileValidation,
                  estimation: result.estimation, parseError: result.parseError,
                })
              : project,
          ),
        );
        setActiveProjectId((prev) => (prev === tempId ? finalId : prev));
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not reach the server.';
        updateProjectById(tempId, { status: 'Failed', parseError: message });
      }
    })();

    return tempId;
  }, [draft, fileValidation, secondFloorFileValidation, updateProjectById]);

  const setActiveProject = useCallback((id) => {
    setActiveProjectId(id);
  }, []);

  const deleteProject = useCallback((id) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    setActiveProjectId((prev) => (prev === id ? null : prev));
    if (typeof id === 'number') {
      apiRequest(`/projects/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  // Fetches the full estimation for the active project if it isn't already
  // in memory (e.g. after a reload, or navigating in from the Projects
  // list) — pages call this, then feed the result into whichever
  // feature/data module they read from.
  const refreshActiveProjectEstimation = useCallback(async () => {
    const id = activeProjectIdRef.current;
    if (typeof id !== 'number') return null;
    const result = await apiRequest(`/projects/${id}`);
    updateProjectById(id, { estimation: result.estimation });
    return result.estimation;
  }, [updateProjectById]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      draft,
      updateDraft,
      resetDraft,
      fileValidation,
      setFileValidation,
      secondFloorFileValidation,
      setSecondFloorFileValidation,
      createProjectFromDraft,
      setActiveProject,
      deleteProject,
      updateActiveProject,
      refreshActiveProjectEstimation,
    }),
    [
      projects,
      activeProjectId,
      activeProject,
      draft,
      updateDraft,
      resetDraft,
      fileValidation,
      secondFloorFileValidation,
      createProjectFromDraft,
      setActiveProject,
      deleteProject,
      updateActiveProject,
      refreshActiveProjectEstimation,
    ],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
