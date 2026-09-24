import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SignUpPage from '../pages/SignUpPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import NewProjectPage from '../pages/NewProjectPage';
import ProjectProcessingPage from '../pages/ProjectProcessingPage';
import ProjectResultsPage from '../pages/ProjectResultsPage';
import MaterialEstimationPage from '../pages/MaterialEstimationPage';
import StoreLocatorPage from '../pages/StoreLocatorPage';
import BrandSelectionPage from '../pages/BrandSelectionPage';
import BillOfMaterialsPage from '../pages/BillOfMaterialsPage';
import ProfilePage from '../pages/ProfilePage';
import DashboardLayout from '../layouts/DashboardLayout';
import { ProjectsProvider } from '../context/ProjectsContext';
import { DashboardActivityProvider } from '../context/DashboardActivityContext';
import RequireRole from './RequireRole';
import RedirectIfAuthenticated from './RedirectIfAuthenticated';
import AdminLayout from '../admin/layouts/AdminLayout';
import AdminDashboardPage from '../admin/pages/AdminDashboardPage';
import AdminUsersPage from '../admin/pages/AdminUsersPage';
import AdminStoresPage from '../admin/pages/AdminStoresPage';
import AdminMaterialsPage from '../admin/pages/AdminMaterialsPage';
import AdminActivityLogPage from '../admin/pages/AdminActivityLogPage';
import AdminSettingsPage from '../admin/pages/AdminSettingsPage';
import { AdminStoresProvider } from '../admin/context/AdminStoresContext';
import { AdminActivityProvider } from '../admin/context/AdminActivityContext';
import { AdminToastProvider } from '../admin/context/AdminToastContext';
import { ROUTES, ADMIN_ROUTES } from './paths';

function AppRoutes() {
  return (
    <Routes>
      {/* No public marketing Landing Page — "/" goes straight to Login. */}
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.LOGIN} element={<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>} />
      <Route path={ROUTES.SIGNUP} element={<RedirectIfAuthenticated><SignUpPage /></RedirectIfAuthenticated>} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
      {/* Public: someone who forgot their password can't sign in first. */}
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={ROUTES.TERMS} element={<TermsPage />} />
      <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />

      {/* Layout route: DashboardLayout mounts once and persists (Sidebar
          open/closed state, etc.) across navigation between these child
          pages. ProjectsProvider lives here too so the project list, the
          active project, and the in-progress "New project" draft all
          survive navigation across the whole authenticated app.
          DashboardActivityProvider tracks dashboard counters/activity the
          same way. Gated by RequireRole exactly like the Admin Module
          below — an unauthenticated session gets sent to Login, and an
          admin session gets sent to its own dashboard instead of ever
          rendering these pages (previously unguarded — reachable directly
          by URL regardless of session, only failing later on the first API
          call with a raw auth-header error). */}
      <Route
        element={
          <RequireRole role="user" redirectTo={ADMIN_ROUTES.DASHBOARD}>
            <DashboardActivityProvider>
              <ProjectsProvider>
                <DashboardLayout />
              </ProjectsProvider>
            </DashboardActivityProvider>
          </RequireRole>
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
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>

      {/* Admin Module: entirely separate layout/nav from the User Module
          above. Gated by RequireRole so a non-admin session can never render
          these pages, and an admin session is kept out of the User Module's
          layout route (see LoginForm's role-based redirect). */}
      <Route
        element={
          <RequireRole role="admin" redirectTo={ROUTES.DASHBOARD}>
            <AdminToastProvider>
              <AdminActivityProvider>
                <AdminStoresProvider>
                  <AdminLayout />
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
        <Route path={ADMIN_ROUTES.ACTIVITY_LOG} element={<AdminActivityLogPage />} />
        <Route path={ADMIN_ROUTES.SETTINGS} element={<AdminSettingsPage />} />
        <Route path={ADMIN_ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default AppRoutes;
