// Usage: node src/scripts/promote-admin.js <username>
import { configDotenv } from "dotenv";
configDotenv();

import { getPool } from "../config/db";

const promoteUser = async () => {
  const username = process.argv[2];

  if (!username) {
    console.error("❌ Please provide a username.");
    process.exit(1);
  }

  try {
    const pool = getPool();
    const query = `UPDATE users SET role = 'admin' WHERE username = $1 RETURNING id, username, role;`;
    const { rows } = await pool.query(query, [username]);

    if (rows.length === 0) {
      console.log(`Could not find user with username: ${username}`);
    } else {
      console.log("✅ Success! User promoted to admin:");
      console.log(rows[0]);
    }
    await pool.end();
  } catch (error) {
    console.error("💀 Error promoting user:", error);
    process.exit(1);
  }
};

promoteUser();
