import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [{ totalProjects }] = await query(
    'SELECT COUNT(*) AS totalProjects FROM projects WHERE user_id = ?',
    [req.user.id],
  );
  const [{ estimationsDone }] = await query(
    `SELECT COUNT(*) AS estimationsDone FROM projects WHERE user_id = ? AND status = 'parsed'`,
    [req.user.id],
  );
  const activities = await query(
    'SELECT id, type, message, created_at AS timestamp FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id],
  );

  res.json({ totalProjects, estimationsDone, activities });
});
