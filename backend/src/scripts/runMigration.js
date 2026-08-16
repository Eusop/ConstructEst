import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node src/scripts/runMigration.js <path-to-sql-file>');
  process.exit(1);
}

const sql = await readFile(path.resolve(migrationFile), 'utf8');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});

try {
  await connection.query(sql);
  console.log(`Applied migration: ${migrationFile}`);
} finally {
  await connection.end();
}
