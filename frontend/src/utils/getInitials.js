/**
 * First letter of up to the first two words of a name, e.g. "Jordan Cruz"
 * -> "JC". Returns an empty string for a blank/missing name rather than a
 * hardcoded placeholder, so an avatar with no name set just renders empty.
 *
 * @param {string|null|undefined} name
 */
export function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}
