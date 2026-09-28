/**
 * Short label for activity feeds: "Just now" within a minute, the clock time
 * for today, then "Yesterday", "N days ago", or a short date after a week.
 * (AdminUsersPage.jsx has a similar formatter with minute/hour steps.)
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
