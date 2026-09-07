export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Maps a column name to a human label, so a duplicate-key error can say
// which field actually collided instead of a vague generic message.
const DUPLICATE_FIELD_LABELS = { employee_id: 'Employee ID', email: 'email address' };

function describeDuplicateEntry(err) {
  const sqlMessage = err.sqlMessage || err.message || '';
  // MySQL includes the unique key name in the error message, e.g.
  // "Duplicate entry 'x' for key 'users.email'".
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
  // `code` is our own app-level error code (like 'PENDING_VERIFICATION'),
  // lets the frontend check a stable value instead of matching message
  // text. Only added for real HttpErrors, a raw 500 could have a system
  // error code like 'ECONNREFUSED' that shouldn't leak to the response.
  if (err.code && status !== 500) body.code = err.code;
  // Only set alongside EMAIL_NOT_VERIFIED, so the frontend can redirect to
  // /verify-email with the real email even if the user typed their
  // Employee ID to log in.
  if (err.email && status !== 500) body.email = err.email;
  return res.status(status).json(body);
}

/** Throw this from a controller: `new HttpError(400, 'message')`, add a
 * code if the frontend needs to branch on it, and an email if that code
 * needs one attached (see login's EMAIL_NOT_VERIFIED). */
export class HttpError extends Error {
  constructor(status, message, code, email) {
    super(message);
    this.status = status;
    this.code = code;
    this.email = email;
  }
}
