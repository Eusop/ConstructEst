import { apiRequest } from './apiClient';

/**
 * Wrappers over the backend's `/api/users/*` endpoints (see users.controller.js):
 * the signed-in user's own profile and password. authService.js has the
 * pre-session `/auth/*` calls and adminService.js the `/admin/*` ones.
 */
export async function updateProfileRequest({ firstName, lastName, email }) {
  const { user } = await apiRequest('/users/me', { method: 'PUT', body: { firstName, lastName, email } });
  return user;
}

export async function changePasswordRequest({ currentPassword, newPassword }) {
  return apiRequest('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } });
}

/**
 * Uploads the image and returns the updated user, whose `avatarUrl` is a real
 * server path (a blob: URL would be lost on the next login).
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

/**
 * Polled while a session is open (see UserContext.jsx) so the admin "online
 * now" dot stays accurate. No response body (204).
 */
export async function sendHeartbeat() {
  return apiRequest('/users/me/heartbeat', { method: 'PUT' });
}
