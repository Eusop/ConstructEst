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

/**
 * Uploads the actual image bytes and returns the updated user, whose
 * `avatarUrl` is a real server path. Previously the page only ever held a
 * `blob:` URL from URL.createObjectURL(), which pointed at one browser
 * document and left the database column NULL — so the photo disappeared on
 * the next login.
 */
export async function uploadAvatarRequest(file) {
  const form = new FormData();
  form.append('avatar', file);
  const { user } = await apiRequest('/users/me/avatar', { method: 'POST', body: form, isMultipart: true });
  return user;
}

export async function removeAvatarRequest() {
  const { user } = await apiRequest('/users/me/avatar', { method: 'DELETE' });
  return user;
}
