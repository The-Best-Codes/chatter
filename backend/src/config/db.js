import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export function query(text, params) {
  return pool.query(text, params);
}
export function getPool() {
  return pool;
}
