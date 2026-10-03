import { verifyToken } from '../services/token.service.js';

// Requests a user with a temporary password may make before setting a new one.
const ALLOWED_WHILE_MUST_CHANGE = new Set([
  'GET /api/auth/me',
  'POST /api/auth/set-new-password',
  'PUT /api/users/me/heartbeat',
]);

/**
 * Verifies the Bearer token and sets `req.user` ({ id, userId, accessRole }).
 * The role comes from the token, never from the request body.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, userId: payload.userId, accessRole: payload.accessRole };
    // A temporary password (set by an admin) only allows choosing a new one.
    if (payload.mustChangePassword && !ALLOWED_WHILE_MUST_CHANGE.has(`${req.method} ${req.baseUrl}${req.path}`)) {
      return res.status(403).json({ message: 'Set a new password first.', code: 'MUST_CHANGE_PASSWORD' });
    }
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/** Limits a route to one access role. Call after `requireAuth`. */
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.accessRole !== role) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}
