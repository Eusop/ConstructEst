/**
 * Formats a Date as a short relative/clock label for activity feeds —
 * "Just now" within the last minute, the time of day for anything else
 * that happened today, then day-aware past that ("Yesterday", "3 days
 * ago", a short date past a week) — see AdminUsersPage.jsx's own
 * formatRelativeTime/formatLastSeen for the same day-bucketing idea
 * applied at minute/hour granularity throughout instead of a same-day
 * clock time.
 *
 * @param {Date} date
 * @param {Date} [now]
 */
export function formatRelativeTime(date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'Just now';

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff <= 0) return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
