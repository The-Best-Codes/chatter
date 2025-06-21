const { Pool } = require("pg");

// The Pool will use the DATABASE_URL from the .env file automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = {
  // We export a query function that executes a query against the pool
  query: (text, params) => pool.query(text, params),
  // We can also export the pool itself if we need direct access for transactions
  getPool: () => pool,
};
