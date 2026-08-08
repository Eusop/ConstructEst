/**
 * Formats a Date as a short relative/clock label for activity feeds —
 * "Just now" within the last minute, otherwise the time of day.
 *
 * @param {Date} date
 * @param {Date} [now]
 */
export function formatRelativeTime(date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}
