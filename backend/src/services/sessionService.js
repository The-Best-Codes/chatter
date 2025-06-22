import { createHash } from "crypto";
import { query as _query } from "../config/db.js";

/**
 * Invalidate all sessions for a specific user
 * This is useful when a user's status is changed or they are deleted
 */
export const invalidateUserSessions = async (userId) => {
  try {
    const query = "DELETE FROM sessions WHERE user_id = $1";
    const { rowCount } = await _query(query, [userId]);
    console.log(`Invalidated ${rowCount} sessions for user ${userId}`);
    return rowCount;
  } catch (error) {
    console.error("Error invalidating user sessions:", error);
    throw error;
  }
};

/**
 * Invalidate a specific session by token hash
 */
export const invalidateSession = async (token) => {
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const query = "DELETE FROM sessions WHERE token_hash = $1";
    const { rowCount } = await _query(query, [tokenHash]);
    return rowCount > 0;
  } catch (error) {
    console.error("Error invalidating session:", error);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId) => {
  try {
    const query = `
      SELECT id, user_agent, ip_address, last_seen_at, created_at
      FROM sessions
      WHERE user_id = $1
      ORDER BY last_seen_at DESC
    `;
    const { rows } = await _query(query, [userId]);
    return rows;
  } catch (error) {
    console.error("Error getting user sessions:", error);
    throw error;
  }
};

/**
 * Update session last seen timestamp
 */
export const updateSessionLastSeen = async (userId, token) => {
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const query = `
      UPDATE sessions
      SET last_seen_at = NOW()
      WHERE user_id = $1 AND token_hash = $2
    `;
    await _query(query, [userId, tokenHash]);
  } catch (error) {
    console.error("Error updating session last seen:", error);
    throw error;
  }
};

/**
 * Clean up expired sessions (older than specified days)
 */
export const cleanupExpiredSessions = async (daysOld = 30) => {
  try {
    const query = `
      DELETE FROM sessions
      WHERE last_seen_at < NOW() - INTERVAL '${daysOld} days'
    `;
    const { rowCount } = await _query(query);
    console.log(`Cleaned up ${rowCount} expired sessions`);
    return rowCount;
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    throw error;
  }
};
