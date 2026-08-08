import { verifyToken } from '../services/token.service.js';

/**
 * Reads and verifies the Bearer token, attaches `{ id, userId, accessRole }`
 * as `req.user`. The access role always comes from the verified token's
 * claims, never from a header/body the client could set directly.
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
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Gate a route to a specific access role. Call after `requireAuth`.
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.accessRole !== role) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}
