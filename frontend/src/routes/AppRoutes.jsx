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
import RequireRole from './RequireRole';
import AdminLayout from '../admin/layouts/AdminLayout';
import AdminDashboardPage from '../admin/pages/AdminDashboardPage';
import AdminUsersPage from '../admin/pages/AdminUsersPage';
import AdminStoresPage from '../admin/pages/AdminStoresPage';
import AdminMaterialsPage from '../admin/pages/AdminMaterialsPage';
import AdminSettingsPage from '../admin/pages/AdminSettingsPage';
import { AdminStoresProvider } from '../admin/context/AdminStoresContext';
import { AdminActivityProvider } from '../admin/context/AdminActivityContext';
import { AdminToastProvider } from '../admin/context/AdminToastContext';
import { ROUTES, ADMIN_ROUTES } from './paths';

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

      {/* Admin Module: entirely separate layout/nav from the User Module
          above. Gated by RequireRole so a non-admin session can never render
          these pages, and an admin session is kept out of the User Module's
          layout route (see LoginForm's role-based redirect). NotificationsProvider
          is mounted only so the reused ProfilePage's addNotification call has
          a provider to talk to — the Admin Module has no notifications
          page/bell of its own. */}
      <Route
        element={
          <RequireRole role="admin" redirectTo={ROUTES.DASHBOARD}>
            <AdminToastProvider>
              <AdminActivityProvider>
                <AdminStoresProvider>
                  <NotificationsProvider>
                    <AdminLayout />
                  </NotificationsProvider>
                </AdminStoresProvider>
              </AdminActivityProvider>
            </AdminToastProvider>
          </RequireRole>
        }
      >
        <Route path={ADMIN_ROUTES.DASHBOARD} element={<AdminDashboardPage />} />
        <Route path={ADMIN_ROUTES.USERS} element={<AdminUsersPage />} />
        <Route path={ADMIN_ROUTES.STORES} element={<AdminStoresPage />} />
        <Route path={ADMIN_ROUTES.MATERIALS} element={<AdminMaterialsPage />} />
        <Route path={ADMIN_ROUTES.SETTINGS} element={<AdminSettingsPage />} />
        <Route path={ADMIN_ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default AppRoutes;
