import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from './apiClient';

/**
 * Real backend calls — LoginForm/SignUpForm already call these with the
 * shapes below (see their own comments), so no component changes were
 * needed to wire this up.
 */
export async function loginRequest({ identifier, password, keepSignedIn }) {
  const { token, user } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  setAuthToken(token, keepSignedIn !== false);
  return user;
}

// Registration no longer creates a usable session — the new account is
// unverified/inactive until an admin approves it (see admin.controller.js's
// verifyUser), so the backend deliberately doesn't return a token here.
// Only set one if a future response ever does include it, rather than
// assuming it always will.
export async function signUpRequest(details) {
  const { firstName, lastName, employeeId, email, password } = details;
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: { firstName, lastName, employeeId, email, password },
  });
  if (response.token) setAuthToken(response.token, true);
  return response;
}

// Neither of these creates a session (no token involved) — email
// verification is the first of two gates a new account has to clear before
// it can log in at all (see auth.controller.js's login: it checks
// email_verified_at before is_verified/is_active).
export async function verifyEmailRequest({ email, code }) {
  return apiRequest('/auth/verify-email', { method: 'POST', body: { email, code } });
}

export async function resendCodeRequest({ email }) {
  return apiRequest('/auth/resend-verification-code', { method: 'POST', body: { email } });
}

/** Live pre-submit duplicate check (see SignUpForm.jsx's debounced effects)
 * — reveals nothing register() doesn't already reveal via a duplicate-entry
 * error at submit time; this just surfaces it earlier, as the user types.
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
