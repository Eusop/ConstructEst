// One password rule for register, reset, change and admin-created users.
// Login is not checked against it, so old 6-character accounts can still sign in.
// Keep in sync with frontend/src/utils/validators.js (isStrongPassword).
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULE_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter and a number.`;

export function isValidPassword(password) {
  const value = String(password ?? '');
  return value.length >= PASSWORD_MIN_LENGTH && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}
