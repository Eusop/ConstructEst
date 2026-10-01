import pool from '../config/db.js';

/**
 * Gives out the next User ID: year + 4-digit number, e.g. 20260001.
 * The counter row for the year goes up by one in a single statement, so two
 * sign-ups at the same time never get the same number. LAST_INSERT_ID(x)
 * makes the new number come back as insertId. The counter never goes down,
 * so a deleted user's ID is not given to anyone else (migration 024).
 */
export async function generateUserId() {
  // Year in Philippine time, since the database server runs on UTC.
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
  const [result] = await pool.query(
    `INSERT INTO user_id_counters (id_year, last_seq) VALUES (?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`,
    [year],
  );
  return `${year}${String(result.insertId).padStart(4, '0')}`;
}
