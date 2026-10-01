export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Maps a column name to a readable label for duplicate-key errors.
const DUPLICATE_FIELD_LABELS = { user_id: 'User ID', email: 'email address' };

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

  // Multer's size limit error has no status, so it would become a generic 500.
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxBytes = err.field === 'avatar'
      ? Number(process.env.MAX_AVATAR_BYTES) || 2 * 1024 * 1024
      : Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;
    return res.status(413).json({ message: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).` });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on our end.' : err.message;
  const body = { message };
  // `code` is our own error code (like 'PENDING_VERIFICATION') so the frontend
  // can check a stable value. Only added for HttpErrors, since a raw 500 could
  // carry a system code like 'ECONNREFUSED' that should not leak.
  if (err.code && status !== 500) body.code = err.code;
  // Only set with EMAIL_NOT_VERIFIED, so the frontend can redirect to
  // /verify-email with the real email even if the user logged in with their User ID.
  if (err.email && status !== 500) body.email = err.email;
  return res.status(status).json(body);
}

/** Throw from a controller: `new HttpError(400, 'message')`. Add a code if the
 * frontend needs to branch on it, and an email if that code needs one. */
export class HttpError extends Error {
  constructor(status, message, code, email) {
    super(message);
    this.status = status;
    this.code = code;
    this.email = email;
  }
}
