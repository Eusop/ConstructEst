/** Basic email shape check, shared by sign-up, profile and admin user forms. */
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? '');
}

/** A 6-digit code as typed by the user. */
export function isValidCode(value) {
  return /^\d{6}$/.test(String(value ?? ''));
}
