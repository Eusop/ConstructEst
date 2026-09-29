// One password rule for register, reset, change and admin-created users:
// 8 to 16 characters with an uppercase letter, a lowercase letter, a number
// and a special character. Login is not checked against it, so older accounts
// can still sign in. Keep in sync with frontend/src/utils/validators.js.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;

export const PASSWORD_RULE_MESSAGE = `Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters with an uppercase letter, a lowercase letter, a number and a special character.`;

export function isValidPassword(password) {
  const value = String(password ?? '');
  return value.length >= PASSWORD_MIN_LENGTH
    && value.length <= PASSWORD_MAX_LENGTH
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /[0-9]/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}
