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

// Starts with a letter (rejects "22"), at least 2 characters total, allows
// spaces/hyphens/apostrophes/periods for real names ("Dela Cruz", "O'Brien",
// "Jr."). \p{L} (Unicode letter) rather than [A-Za-z] so accented names
// aren't rejected.
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;

export function isValidName(value) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && NAME_PATTERN.test(trimmed);
}

// 3-20 characters, starts with a letter, then letters/digits/_/./- only —
// a fairly standard identifier convention.
const EMPLOYEE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{2,19}$/;

export function isValidEmployeeId(value) {
  return EMPLOYEE_ID_PATTERN.test(value.trim());
}

/**
 * What's actually missing from an in-progress Employee ID, spelled out
 * instead of just restating the whole rule — e.g. "22" -> "Needs to start
 * with a letter, be at least 3 characters". Returns null once the value is
 * valid (or empty — a blank field's message is "required", handled
 * separately by the caller).
 *
 * @param {string} value
 * @returns {string|null}
 */
export function getEmployeeIdHint(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const missing = [];
  if (!/^[A-Za-z]/.test(trimmed)) missing.push('start with a letter');
  if (trimmed.length < 3) missing.push('be at least 3 characters');
  if (trimmed.length > 20) missing.push('be 20 characters or fewer');
  if (!/^[A-Za-z0-9_.-]*$/.test(trimmed)) missing.push('only use letters, numbers, and _ . -');

  return missing.length > 0 ? `Needs to ${missing.join(', ')}` : null;
}

// Every condition below is required (&&, not ||) — a password missing just
// one category (e.g. "password123": lowercase + digits, no uppercase, no
// symbol) still fails, not just ones missing everything.
export function isStrongPassword(value) {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return value.length >= 8 && value.length <= 16 && hasUpper && hasLower && hasNumber && hasSymbol;
}

/**
 * Live strength rating for a password-in-progress — same 5 criteria
 * `isStrongPassword` requires, but broken out per-criterion (for a
 * checklist UI) plus a 0-5 score and Weak/Fair/Strong label, so a
 * password field can show *how close* it is rather than just pass/fail.
 *
 * @param {string} value
 * @returns {{ criteria: {length:boolean, upper:boolean, lower:boolean, number:boolean, symbol:boolean},
 *   metCount: number, total: number, label: 'Weak'|'Fair'|'Strong' }}
 */
export function getPasswordStrength(value) {
  const criteria = {
    length: value.length >= 8 && value.length <= 16,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
  const metCount = Object.values(criteria).filter(Boolean).length;
  const label = metCount <= 2 ? 'Weak' : metCount <= 4 ? 'Fair' : 'Strong';
  return { criteria, metCount, total: 5, label };
}
