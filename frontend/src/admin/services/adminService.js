import { apiRequest } from '../../services/apiClient';

/**
 * Thin wrappers over the backend's `/api/admin/*` endpoints (see
 * backend/src/controllers/admin.controller.js and stores.controller.js).
 * Everything here reads/writes the real `stores`/`material_brands`/
 * `store_material_prices` tables — the same catalog the User Module's Store
 * Locator and Brand Selection pages already depend on, so changes made here
 * are immediately visible there too (see admin/context/AdminStoresContext).
 */
export const listAdminUsers = () => apiRequest('/admin/users');

export const createAdminUser = (body) => apiRequest('/admin/users', { method: 'POST', body });

export const updateAdminUser = (id, body) => apiRequest(`/admin/users/${id}`, { method: 'PUT', body });

export const setAdminUserActive = (id, isActive) =>
  apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } });

export const getGlobalConstants = () => apiRequest('/admin/estimation-constants');

export const updateGlobalConstants = (body) => apiRequest('/admin/estimation-constants', { method: 'PUT', body });

// --- Hardware stores ---------------------------------------------------

export const listAdminStores = () => apiRequest('/admin/stores');

export const createAdminStore = (body) => apiRequest('/admin/stores', { method: 'POST', body });

export const updateAdminStore = (id, body) => apiRequest(`/admin/stores/${id}`, { method: 'PUT', body });

export const deleteAdminStore = (id) => apiRequest(`/admin/stores/${id}`, { method: 'DELETE' });

/** The full global material_brands catalog, left-joined against this
 * store's own prices — brands with `storePrice: null` aren't stocked here
 * yet (see admin.controller.js's getStoreCatalog for the exact shape). */
export const getStoreCatalog = (storeId) => apiRequest(`/admin/stores/${storeId}/catalog`);

// --- Materials & brands --------------------------------------------------

export const listAdminMaterials = () => apiRequest('/admin/materials');

export const createAdminMaterial = (body) => apiRequest('/admin/materials', { method: 'POST', body });

export const updateAdminMaterial = (id, body) => apiRequest(`/admin/materials/${id}`, { method: 'PUT', body });

export const deleteAdminMaterial = (id) => apiRequest(`/admin/materials/${id}`, { method: 'DELETE' });

/** Sets (or updates) one store's price/availability for an existing global
 * brand — this is what actually makes a brand "stocked" at a store. */
export const setStoreMaterialPrice = (storeId, materialBrandId, body) =>
  apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'PUT', body });

/** Unassigns a brand from a store (the global brand definition itself is
 * untouched, so it stays available to price at other stores). */
export const removeStoreMaterialPrice = (storeId, materialBrandId) =>
  apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'DELETE' });
