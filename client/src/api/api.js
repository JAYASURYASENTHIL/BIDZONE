/**
 * api.js — Central fetch wrapper for all backend calls.
 *
 * - Uses relative URLs (/api/...) so Vite's dev proxy handles routing.
 * - credentials: 'include' ensures the session cookie is sent on every request.
 * - Never touches localStorage for auth state.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',           // always send session cookie
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    // Attach the server's message to the thrown error so callers can display it
    const err = new Error(data.message || 'Something went wrong.');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Auth endpoints (match backend routes exactly) ────────────────────────────

export const authApi = {
  /** POST /api/auth/signup  — fields: name, email, password */
  signup: (name, email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  /** POST /api/auth/login  — fields: email, password */
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** POST /api/auth/logout  — requires active session */
  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  /** GET /api/auth/me  — returns current user or throws 401 */
  me: () =>
    request('/auth/me', { method: 'GET' }),
};
