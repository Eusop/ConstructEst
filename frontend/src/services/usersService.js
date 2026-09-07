import { apiRequest } from './apiClient';

/**
 * Thin wrappers over the backend's `/api/users/*` endpoints (see
 * backend/src/controllers/users.controller.js) — the signed-in user's own
 * profile/password, as opposed to authService.js's pre-session `/auth/*`
 * endpoints or adminService.js's admin-only `/admin/*` ones.
 */
export async function updateProfileRequest({ firstName, lastName, email }) {
  const { user } = await apiRequest('/users/me', { method: 'PUT', body: { firstName, lastName, email } });
  return user;
}

export async function changePasswordRequest({ currentPassword, newPassword }) {
  return apiRequest('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } });
}
