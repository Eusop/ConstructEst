import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from './apiClient';

/** Real backend calls, used by LoginForm and SignUpForm. */
export async function loginRequest({ identifier, password, keepSignedIn }) {
  const { token, user } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  setAuthToken(token, keepSignedIn !== false);
  return user;
}

// Registration doesn't create a session: the account stays unverified and
// inactive until an admin approves it (verifyUser), so no token is returned.
// Only set one if a response ever includes it.
export async function signUpRequest(details) {
  const { firstName, lastName, employeeId, email, password } = details;
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: { firstName, lastName, employeeId, email, password },
  });
  if (response.token) setAuthToken(response.token, true);
  return response;
}

// Neither of these creates a session. Email verification is the first of two
// gates before login: auth.controller.js checks email_verified_at before
// is_verified/is_active.
export async function verifyEmailRequest({ email, code }) {
  return apiRequest('/auth/verify-email', { method: 'POST', body: { email, code } });
}

export async function resendCodeRequest({ email }) {
  return apiRequest('/auth/resend-verification-code', { method: 'POST', body: { email } });
}

/** Asks for a reset code. Always resolves with the same message whether or not
 * the address is registered (see forgotPassword), so success does not prove the
 * account exists. */
export async function forgotPasswordRequest({ email }) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}

/** Uses the emailed code to set the new password. Unlike the request above, it
 * reports real errors (wrong or expired code). */
export async function resetPasswordRequest({ email, code, newPassword }) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { email, code, newPassword } });
}

/** Live duplicate check for SignUpForm's debounced effects. It reveals nothing
 * register() doesn't already reveal on a duplicate; it just shows it earlier.
 * @param {'email'|'employeeId'} field
 * @param {string} value
 */
export async function checkAvailability(field, value) {
  const query = new URLSearchParams({ field, value }).toString();
  return apiRequest(`/auth/check-availability?${query}`);
}

export function logout() {
  clearAuthToken();
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

export async function fetchCurrentUser() {
  const { user } = await apiRequest('/auth/me');
  return user;
}
