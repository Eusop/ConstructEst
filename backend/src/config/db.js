import mysql from 'mysql2/promise';

// Hosted MySQL providers (TiDB Cloud, Aiven, PlanetScale, …) require TLS.
// DB_SSL=true  -> verify the server cert against the system CA store
// DB_SSL=no-verify -> encrypt but skip cert verification (last resort)
function sslOption() {
  const mode = (process.env.DB_SSL || '').toLowerCase();
  if (mode === 'true' || mode === '1' || mode === 'require') {
    return { minVersion: 'TLSv1.2', rejectUnauthorized: true };
  }
  if (mode === 'no-verify') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'constructest',
  ssl: sslOption(),
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
});

/**
 * Runs a parameterized query and returns just the rows (unwraps mysql2's
 * `[rows, fields]` tuple) — every call site uses `?` placeholders, never
 * string concatenation.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export default pool;
