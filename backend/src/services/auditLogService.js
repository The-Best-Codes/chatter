import { query as _query } from "../config/db";

const AuditLog = {};

/**
 * Logs an action performed by an administrator.
 * @param {object} logData - The data for the log entry.
 * @param {string} logData.adminUserId - The ID of the admin performing the action.
 * @param {string} logData.action - A descriptor for the action (e.g., 'user.update.status').
 * @param {string} [logData.targetUserId] - The ID of the user being affected.
 * @param {object} [logData.details] - A JSON object with before/after values or other context.
 * @param {string} logData.ipAddress - The IP address of the admin.
 */
AuditLog.logAction = async (logData) => {
  const {
    adminUserId,
    action,
    targetUserId = null,
    details = {},
    ipAddress,
  } = logData;
  const query = `
        INSERT INTO admin_audit_logs (admin_user_id, action, target_user_id, details, ip_address)
        VALUES ($1, $2, $3, $4, $5);
    `;
  try {
    await _query(query, [
      adminUserId,
      action,
      targetUserId,
      details,
      ipAddress,
    ]);
  } catch (error) {
    // We log the error but don't throw, as a failing audit log
    // shouldn't block the primary action from completing.
    console.error("Failed to write to audit log:", error);
  }
};

export default AuditLog;
