/**
 * Thin fetch wrapper for the ConstructEst backend. All service files use it
 * for the base URL, auth header and error shape.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'constructest_token';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveAssetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

export class ApiError extends Error {
  constructor(status, message, code, email) {
    super(message);
    this.status = status;
    this.code = code;
    this.email = email;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/** `persist: true` ("Keep me signed in") keeps the token after the browser closes;
 * otherwise it clears when the tab closes. */
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
    // No or invalid JSON body (e.g. 204): data stays null.
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.message || `Request failed (${response.status}).`, data?.code, data?.email);
  }

  return data;
}

/**
 * Downloads a file from an authenticated route. A plain `<a href>` can't send
 * the Bearer token (see downloadQuotation in admin.controller.js), so this
 * fetches it as a blob and triggers the download.
 *
 * @param {string} path e.g. '/admin/quotations/172...-quote.pdf'
 * @param {string} [filename] Suggested save-as name; defaults to the path's last segment.
 */
export async function downloadFile(path, filename) {
  const headers = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    let message = `Download failed (${response.status}).`;
    try {
      message = (await response.json())?.message || message;
    } catch {
      // No or invalid JSON body: keep the generic message.
    }
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || path.split('/').pop();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
