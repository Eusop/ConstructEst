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

export function isStrongPassword(value) {
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9]/.test(value);
  return minLength(value, 8) && hasLetter && hasNumber && hasSymbol;
}
