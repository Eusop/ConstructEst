import { apiRequest, downloadFile } from '../../services/apiClient';

/**
 * Wrappers over the backend's `/api/admin/*` endpoints (see admin.controller.js
 * and stores.controller.js). They read and write the real `stores`,
 * `material_brands` and `store_material_prices` tables, the same catalog Store
 * Locator and Brand Selection use (see admin/context/AdminStoresContext).
 */
export const listAdminUsers = () => apiRequest('/admin/users');

export const createAdminUser = (body) => apiRequest('/admin/users', { method: 'POST', body });

export const updateAdminUser = (id, body) => apiRequest(`/admin/users/${id}`, { method: 'PUT', body });

export const setAdminUserActive = (id, isActive) =>
  apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } });

/** Approves a pending self-registered account: sets it verified and active in one step. */
export const verifyAdminUser = (id) => apiRequest(`/admin/users/${id}/verify`, { method: 'PATCH' });

/** Emails the user a password reset code (same as Forgot password). */
export const sendUserResetCode = (id) => apiRequest(`/admin/users/${id}/send-reset-code`, { method: 'POST' });

/** Sets a generated temporary password and returns it once ({ temporaryPassword, expiresInHours }). */
export const setUserTemporaryPassword = (id) => apiRequest(`/admin/users/${id}/temporary-password`, { method: 'POST' });

/**
 * Permanently deletes a user and everything they own (projects, estimates,
 * notifications; see deleteUser in admin.controller.js). Admin accounts get a
 * 403, so only call it for regular users.
 */
export const deleteAdminUser = (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' });

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

/**
 * The full global material_brands catalog, left-joined with this store's prices.
 * Brands with `storePrice: null` aren't stocked here yet (see getStoreCatalog in
 * admin.controller.js).
 */
export const getStoreCatalog = (storeId) => apiRequest(`/admin/stores/${storeId}/catalog`);

// --- Materials & brands --------------------------------------------------

export const listAdminMaterials = () => apiRequest('/admin/materials');

export const createAdminMaterial = (body) => apiRequest('/admin/materials', { method: 'POST', body });

export const updateAdminMaterial = (id, body) => apiRequest(`/admin/materials/${id}`, { method: 'PUT', body });

export const deleteAdminMaterial = (id) => apiRequest(`/admin/materials/${id}`, { method: 'DELETE' });

/**
 * Sets or updates one store's price and availability for an existing global
 * brand. This is what makes a brand "stocked" at a store. A price decision needs
 * a `quotationFile` (PDF/Word/Excel) as proof, sent as multipart when given. The
 * one caller without one, addMaterialsToStore in AdminStoresContext.jsx (carrying
 * a catalog price into a first stocking), sets `usesCatalogPrice: true`, which the
 * backend accepts as the exception (see upsertStoreMaterialPrice in admin.controller.js).
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

/** Unassigns a brand from a store. The global brand stays, so other stores can still price it. */
export const removeStoreMaterialPrice = (storeId, materialBrandId) =>
  apiRequest(`/admin/stores/${storeId}/materials/${materialBrandId}`, { method: 'DELETE' });

/**
 * Downloads a price change's quotation proof (see `quotationStoredName` in
 * upsertStoreMaterialPrice) as an authenticated blob, saved under its original name.
 */
export const downloadQuotationFile = (storedName, displayName) =>
  downloadFile(`/admin/quotations/${encodeURIComponent(storedName)}?name=${encodeURIComponent(displayName || storedName)}`, displayName);

// --- Activity backlog --------------------------------------------------

/**
 * Read-only saved admin audit trail. Only the server writes to it (see logAdminActivity in admin.controller.js).
 * @param {{ category?: 'user_management' | 'store_management', limit?: number }} [params]
 */
export const listAdminActivityLog = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ).toString();
  return apiRequest(`/admin/activity-log${query ? `?${query}` : ''}`);
};
