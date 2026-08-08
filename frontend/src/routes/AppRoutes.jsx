import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignUpPage from '../pages/SignUpPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import NewProjectPage from '../pages/NewProjectPage';
import ProjectProcessingPage from '../pages/ProjectProcessingPage';
import ProjectResultsPage from '../pages/ProjectResultsPage';
import MaterialEstimationPage from '../pages/MaterialEstimationPage';
import StoreLocatorPage from '../pages/StoreLocatorPage';
import BrandSelectionPage from '../pages/BrandSelectionPage';
import BillOfMaterialsPage from '../pages/BillOfMaterialsPage';
import SettingsPage from '../pages/SettingsPage';
import ProfilePage from '../pages/ProfilePage';
import NotificationsPage from '../pages/NotificationsPage';
import DashboardLayout from '../layouts/DashboardLayout';
import { ProjectsProvider } from '../context/ProjectsContext';
import { DashboardActivityProvider } from '../context/DashboardActivityContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { ROUTES } from './paths';

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />

      {/* Layout route: DashboardLayout mounts once and persists (Sidebar
          open/closed state, etc.) across navigation between these child
          pages. ProjectsProvider lives here too so the project list, the
          active project, and the in-progress "New project" draft all
          survive navigation across the whole authenticated app.
          DashboardActivityProvider tracks dashboard counters/activity the
          same way. */}
      <Route
        element={
          <DashboardActivityProvider>
            <NotificationsProvider>
              <ProjectsProvider>
                <DashboardLayout />
              </ProjectsProvider>
            </NotificationsProvider>
          </DashboardActivityProvider>
        }
      >
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
        <Route path={ROUTES.NEW_PROJECT} element={<NewProjectPage />} />
        <Route path={ROUTES.PROJECT_PROCESSING} element={<ProjectProcessingPage />} />
        <Route path={ROUTES.PROJECT_RESULTS} element={<ProjectResultsPage />} />
        <Route path={ROUTES.MATERIAL_ESTIMATION} element={<MaterialEstimationPage />} />
        <Route path={ROUTES.STORE_LOCATOR} element={<StoreLocatorPage />} />
        <Route path={ROUTES.BRAND_SELECTION} element={<BrandSelectionPage />} />
        <Route path={ROUTES.BILL_OF_MATERIALS} element={<BillOfMaterialsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default AppRoutes;
