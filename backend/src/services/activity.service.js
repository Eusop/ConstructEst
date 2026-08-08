import { query } from '../config/db.js';

export async function logActivity(userId, projectId, type, message) {
  await query(
    'INSERT INTO activity_log (user_id, project_id, type, message) VALUES (?, ?, ?, ?)',
    [userId, projectId, type, message],
  );
}

export async function addNotification(userId, type, title, message) {
  await query(
    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
    [userId, type, title, message],
  );
}
