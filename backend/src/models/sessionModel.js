import { createHash } from "crypto";
import { query as _query } from "../config/db";

const Session = {};

Session.create = async (userId, token, userAgent, ipAddress) => {
  // We store a hash of the token, not the token itself, for security.
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const query = `
        INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, last_seen_at)
        VALUES ($1, $2, $3, $4, NOW());
    `;
  await _query(query, [userId, tokenHash, userAgent, ipAddress]);
};

Session.findByUserId = async (userId) => {
  const query =
    "SELECT id, user_agent, ip_address, last_seen_at, created_at FROM sessions WHERE user_id = $1 ORDER BY last_seen_at DESC";
  const { rows } = await _query(query, [userId]);
  return rows;
};

Session.delete = async (sessionId, userId) => {
  // Users should only be able to delete their own sessions.
  const query = "DELETE FROM sessions WHERE id = $1 AND user_id = $2";
  const { rowCount } = await _query(query, [sessionId, userId]);
  return rowCount; // Returns 1 if successful, 0 if not found or not owned by user.
};

export default Session;
