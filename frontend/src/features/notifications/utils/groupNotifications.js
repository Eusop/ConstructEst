function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * "10:24 AM" for anything from today or yesterday (the section header
 * already says which), otherwise a short date like "Jul 22".
 *
 * @param {Date} date
 * @param {Date} [now]
 */
export function formatNotificationTimestamp(date, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now) || isSameDay(date, yesterday)) {
    return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/**
 * Buckets notifications into Today / Yesterday / Earlier sections (in that
 * order), preserving each entry's relative order within its bucket. Empty
 * buckets are omitted, so e.g. a fresh "Unread" filter with nothing from
 * today just starts at "Yesterday".
 *
 * @param {Array<{timestamp: Date}>} notifications
 * @param {Date} [now]
 */
export function groupNotificationsByDay(notifications, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const buckets = { today: [], yesterday: [], earlier: [] };
  notifications.forEach((notification) => {
    if (isSameDay(notification.timestamp, now)) buckets.today.push(notification);
    else if (isSameDay(notification.timestamp, yesterday)) buckets.yesterday.push(notification);
    else buckets.earlier.push(notification);
  });

  return [
    { key: 'today', label: 'Today', items: buckets.today },
    { key: 'yesterday', label: 'Yesterday', items: buckets.yesterday },
    { key: 'earlier', label: 'Earlier', items: buckets.earlier },
  ].filter((group) => group.items.length > 0);
}
