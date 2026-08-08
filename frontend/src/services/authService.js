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

export async function signUpRequest(details) {
  const { firstName, lastName, userId, email, prcLicense, password } = details;
  const { token, user } = await apiRequest('/auth/register', {
    method: 'POST',
    body: { firstName, lastName, userId, email, prcLicense: prcLicense || undefined, password },
  });
  setAuthToken(token, true);
  return user;
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
