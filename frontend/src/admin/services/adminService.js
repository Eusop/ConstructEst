import { apiRequest } from '../../services/apiClient';

/**
 * Thin wrappers over the backend's already-built `/api/admin/*` endpoints
 * (see backend/src/controllers/admin.controller.js) — User Management and
 * global Estimation Settings are real, persisted data (see AdminUsersPage /
 * AdminSettingsPage); Hardware Stores and Materials & Brands stay
 * admin-session-local for now (see admin/context/AdminStoresContext) so
 * this build doesn't touch the `stores`/`material_brands` catalog the
 * existing User Module's Store Locator and Brand Selection already depend
 * on — swap those pages to call this same module once that catalog is
 * meant to become admin-editable too.
 */
export const listAdminUsers = () => apiRequest('/admin/users');

export const createAdminUser = (body) => apiRequest('/admin/users', { method: 'POST', body });

export const updateAdminUser = (id, body) => apiRequest(`/admin/users/${id}`, { method: 'PUT', body });

export const setAdminUserActive = (id, isActive) =>
  apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } });

export const getGlobalConstants = () => apiRequest('/admin/estimation-constants');

export const updateGlobalConstants = (body) => apiRequest('/admin/estimation-constants', { method: 'PUT', body });
