import { apiRequest, downloadFile } from '../../services/apiClient';

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

/** Approves a pending self-registered account — sets it verified + active in one step. */
export const verifyAdminUser = (id) => apiRequest(`/admin/users/${id}/verify`, { method: 'PATCH' });

export const getGlobalConstants = () => apiRequest('/admin/estimation-constants');

export const updateGlobalConstants = (body) => apiRequest('/admin/estimation-constants', { method: 'PUT', body });

export const getGlobalDesignOverrides = () => apiRequest('/admin/design-overrides');

export const updateGlobalDesignOverrides = (body) => apiRequest('/admin/design-overrides', { method: 'PUT', body });

// --- Hardware stores ---------------------------------------------------

export const listAdminStores = () => apiRequest('/admin/stores');

export const createAdminStore = (body) => apiRequest('/admin/stores', { method: 'POST', body });

export const updateAdminStore = (id, body) => apiRequest(`/admin/stores/${id}`, { method: 'PUT', body });

export const setAdminStoreActive = (id, isActive) =>
  apiRequest(`/admin/stores/${id}/status`, { method: 'PATCH', body: { isActive } });

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
 * brand — this is what actually makes a brand "stocked" at a store.
 *
 * A real price decision needs a `quotationFile` (PDF/Word/Excel) attached as
 * proof — sent as multipart when one's given. The one caller that doesn't
 * have one, `AdminStoresContext.jsx`'s addMaterialsToStore (carrying a
 * brand's existing catalog price into a store's first stocking of it,
 * nothing new decided), sets `usesCatalogPrice: true` instead, which the
 * backend accepts as the documented exception (see admin.controller.js's
 * upsertStoreMaterialPrice).
 *
 * @param {number} storeId
 * @param {number} materialBrandId
 * @param {{price: number, inStock: boolean, usesCatalogPrice?: boolean}} body
 * @param {File} [quotationFile]
 */
export const setStoreMaterialPrice = (storeId, materialBrandId, body, quotationFile) => {
  if (!quotationFile) {
    return apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'PUT', body });
  }
  const formData = new FormData();
  formData.append('price', String(body.price));
  formData.append('inStock', String(body.inStock));
  formData.append('quotationFile', quotationFile);
  return apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'PUT', body: formData, isMultipart: true });
};

/** Unassigns a brand from a store (the global brand definition itself is
 * untouched, so it stays available to price at other stores). */
export const removeStoreMaterialPrice = (storeId, materialBrandId) =>
  apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'DELETE' });

/** Downloads a price change's quotation proof (see upsertStoreMaterialPrice's
 * `quotationStoredName` metadata) as an authenticated blob, saved under its
 * original filename. */
export const downloadQuotationFile = (storedName, displayName) =>
  downloadFile(`/admin/quotations/${encodeURIComponent(storedName)}?name=${encodeURIComponent(displayName || storedName)}`, displayName);

// --- Activity backlog --------------------------------------------------

/** Read-only, persisted admin audit trail — see admin.controller.js's
 * logAdminActivity for what writes to it (never the client directly).
 * @param {{ category?: 'user_management' | 'store_management', limit?: number }} [params]
 */
export const listAdminActivityLog = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ).toString();
  return apiRequest(`/admin/activity-log${query ? `?${query}` : ''}`);
};
