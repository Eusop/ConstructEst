/**
 * Thin fetch wrapper for the ConstructEst backend (see ../../backend). Every
 * other service file (authService, dxfParserService, the mock-data modules
 * being swapped for real fetches) goes through this one place for the base
 * URL, auth header, and error shape — so none of them duplicate that logic.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'constructest_token';

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/** `persist: true` (the "Keep me signed in" checkbox) survives browser restarts; otherwise the token clears when the tab closes. */
export function setAuthToken(token, persist = true) {
  clearAuthToken();
  (persist ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * @param {string} path e.g. '/projects/12/bom'
 * @param {{ method?: string, body?: object|FormData, isMultipart?: boolean }} [options]
 */
export async function apiRequest(path, { method = 'GET', body, isMultipart = false } = {}) {
  const headers = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body !== undefined && !isMultipart) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, { method, headers, body: payload });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // No/invalid JSON body (e.g. 204 No Content) — fine, data stays null.
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.message || `Request failed (${response.status}).`, data?.code);
  }

  return data;
}
