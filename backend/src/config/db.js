import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'constructest',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns as JS numbers, not strings
});

/** Runs a query and returns just the rows. Always use `?` placeholders. */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export default pool;
