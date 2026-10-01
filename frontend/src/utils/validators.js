export function isRequired(value) {
  return value.trim().length > 0;
}

export function minLength(value, length) {
  return value.trim().length >= length;
}

export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value.trim());
}

// Starts with a letter, at least 2 characters. Allows spaces, hyphens,
// apostrophes and periods ("Dela Cruz", "O'Brien", "Jr."). Uses \p{L} so
// accented names are not rejected.
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;

export function isValidName(value) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && NAME_PATTERN.test(trimmed);
}

// 8 to 16 characters with an uppercase letter, a lowercase letter, a number
// and a special character. Same as the backend's passwordPolicy.js. Login is
// not checked against it, so older accounts can still sign in.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;
export const PASSWORD_RULE_MESSAGE = `Must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters with an uppercase letter, a lowercase letter, a number and a special character`;

export function isStrongPassword(value) {
  const { criteria } = getPasswordStrength(value);
  return Object.values(criteria).every(Boolean);
}

/**
 * Live strength rating for a password being typed: the same 5 criteria
 * isStrongPassword requires, for a checklist UI, plus a 0-5 score and a
 * Weak/Fair/Strong label.
 *
 * @param {string} value
 * @returns {{ criteria: {length:boolean, upper:boolean, lower:boolean, number:boolean, symbol:boolean},
 *   metCount: number, total: number, label: 'Weak'|'Fair'|'Strong' }}
 */
export function getPasswordStrength(value) {
  const criteria = {
    length: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
  const metCount = Object.values(criteria).filter(Boolean).length;
  const label = metCount <= 2 ? 'Weak' : metCount <= 4 ? 'Fair' : 'Strong';
  return { criteria, metCount, total: 5, label };
}
