export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Maps a unique-constraint column name to what a user actually typed into a
// form, so a duplicate-key error can say *which* field collided instead of
// a vague "That value is already in use." (which reads as if it could be
// about the password — it's never the password; passwords aren't unique).
const DUPLICATE_FIELD_LABELS = { employee_id: 'Employee ID', email: 'email address' };

function describeDuplicateEntry(err) {
  const sqlMessage = err.sqlMessage || err.message || '';
  // MySQL/MariaDB names the offending unique key in the error, e.g.
  // "Duplicate entry 'x' for key 'users.email'" or "for key 'email'".
  for (const [column, label] of Object.entries(DUPLICATE_FIELD_LABELS)) {
    if (new RegExp(`key '[^']*\\b${column}\\b`, 'i').test(sqlMessage)) {
      return `That ${label} is already in use.`;
    }
  }
  return 'That value is already in use.';
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: describeDuplicateEntry(err) });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on our end.' : err.message;
  const body = { message };
  // `code` here is an app-level HttpError code (e.g. 'PENDING_VERIFICATION',
  // see auth.controller.js's login) — not the MySQL driver's err.code
  // checked above — so the frontend can branch on a stable identifier
  // instead of matching message text, which a wording change would
  // silently break. Guarded to real HttpErrors only: a raw 500 could carry
  // an unrelated system error code (e.g. 'ECONNREFUSED') that has no
  // business leaking into a response body.
  if (err.code && status !== 500) body.code = err.code;
  return res.status(status).json(body);
}

/** Small helper for controllers: `throw new HttpError(400, 'message')` —
 * or `throw new HttpError(403, 'message', 'SOME_CODE')` when the frontend
 * needs to branch on this specific error rather than just display it. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
