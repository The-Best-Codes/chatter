import { randomBytes } from "crypto";
import { query as queryDatabase } from "../config/db.js";
import {
  getAllUsers as getAllUsersFromModel,
  getSettings as getSettingsFromModel,
  softDeleteUser as softDeleteUserFromModel,
  updatePermissionsForUser as updatePermissionsForUserFromModel,
  updateSetting as updateSettingFromModel,
  updateUserStatus as updateUserStatusFromModel,
} from "../models/adminModel.js";
import { logAction } from "../services/auditLogService.js";
import { updateUserRole } from "../services/permissionService.js";
import { invalidateUserSessions } from "../services/sessionService.js";
import { disconnectUser } from "../services/websocketService.js";

// GET /api/admin/settings
export async function getAppSettings(req, res) {
  try {
    const settings = await getSettingsFromModel();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve settings." });
  }
}

// PUT /api/admin/settings
export async function updateAppSettings(req, res) {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res
      .status(400)
      .json({ message: "Setting key and value are required." });
  }

  try {
    const oldSettings = await getSettingsFromModel();
    const updatedSetting = await updateSettingFromModel(key, value);

    await logAction({
      adminUserId: req.user.id,
      action: `setting.update.${key}`,
      details: { oldValue: oldSettings[key], newValue: value },
      ipAddress: req.ip,
    });

    res.status(200).json(updatedSetting);
  } catch (error) {
    res.status(500).json({ message: "Failed to update setting." });
  }
}

// GET /api/admin/users
export async function listUsers(req, res) {
  const { page, limit } = req.query;
  try {
    const result = await getAllUsersFromModel({ page, limit });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve users." });
  }
}

// POST /api/admin/users/:userId/status
export async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;

  if (!["active", "frozen"].includes(status)) {
    return res.status(400).json({ message: "Invalid status provided." });
  }

  try {
    const updatedUser = await updateUserStatusFromModel(userId, status);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    await logAction({
      adminUserId: req.user.id,
      action: "user.update.status",
      targetUserId: userId,
      details: { newStatus: status },
      ipAddress: req.ip,
    });

    // Invalidate user's sessions and websocket connections
    await invalidateUserSessions(userId);
    disconnectUser(userId);

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user status." });
  }
}

// DELETE /api/admin/users/:userId
export async function deleteUser(req, res) {
  const { userId } = req.params;
  try {
    const deletedUser = await softDeleteUserFromModel(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    await logAction({
      adminUserId: req.user.id,
      action: "user.delete",
      targetUserId: userId,
      ipAddress: req.ip,
    });

    // Invalidate user's sessions and websocket connections
    await invalidateUserSessions(userId);
    disconnectUser(userId);

    res.status(200).json({ message: "User successfully deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user." });
  }
}

// PUT /api/admin/users/:userId/permissions
export async function updateUserPermissions(req, res) {
  const { userId } = req.params;
  const permissions = req.body; // Expects an object of permissions

  try {
    const updatedPerms = await updatePermissionsForUserFromModel(
      userId,
      permissions,
    );
    await logAction({
      adminUserId: req.user.id,
      action: "user.update.permissions",
      targetUserId: userId,
      details: { newPermissions: permissions },
      ipAddress: req.ip,
    });
    res.status(200).json(updatedPerms);
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ message: "Failed to update user permissions." });
  }
}

// PUT /api/admin/users/:userId/role
export async function updateUserRoleController(req, res) {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !["user", "admin"].includes(role)) {
    return res.status(400).json({ 
      message: "Valid role (user or admin) is required." 
    });
  }

  try {
    const result = await updateUserRole(userId, role);
    
    await logAction({
      adminUserId: req.user.id,
      action: "user.role.update",
      targetUserId: userId,
      details: { newRole: role },
      ipAddress: req.ip,
    });

    res.status(200).json({ 
      message: "User role updated successfully",
      role: result.role 
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role." });
  }
}

// POST /api/admin/users/:userId/password-reset
export async function generatePasswordResetCode(req, res) {
  const { userId } = req.params;
  // In a real app, this code would be emailed or sent via another secure channel.
  // Here we will just return it to the admin.
  const resetCode = randomBytes(8).toString("hex");
  const saltRounds = 10;
  const hashedCode = await require("bcrypt").hash(resetCode, saltRounds);

  // Store the hashed reset code in a separate table with expiry
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  try {
    const insertQuery = `
      INSERT INTO password_resets (user_id, hashed_code, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET hashed_code = EXCLUDED.hashed_code, expires_at = EXCLUDED.expires_at, created_at = NOW()
    `;
    await queryDatabase(insertQuery, [userId, hashedCode, expiresAt]);
  } catch (error) {
    console.error("Error storing password reset code:", error);
    return res
      .status(500)
      .json({ message: "Failed to generate password reset code." });
  }

  await logAction({
    adminUserId: req.user.id,
    action: "user.password_reset.generate",
    targetUserId: userId,
    ipAddress: req.ip,
  });

  res.status(200).json({
    message:
      "Password reset code generated. Please securely transmit this to the user.",
    resetCode: resetCode,
  });
}

// GET /api/admin/audit-logs
export async function getAuditLogs(req, res) {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const query = `
      SELECT 
        al.id,
        al.action,
        al.details,
        al.ip_address,
        al.created_at,
        au.username as admin_username,
        tu.username as target_username
      FROM admin_audit_logs al
      LEFT JOIN users au ON al.admin_user_id = au.id
      LEFT JOIN users tu ON al.target_user_id = tu.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const { rows } = await queryDatabase(query, [limit, offset]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to retrieve audit logs." });
  }
}

// GET /api/admin/invite-codes
export async function getInviteCodes(req, res) {
  try {
    const query = `
      SELECT 
        ic.id,
        ic.code,
        ic.created_at,
        ic.expires_at,
        ic.used_by_user_id,
        u.username as used_by_username
      FROM invite_codes ic
      LEFT JOIN users u ON ic.used_by_user_id = u.id
      ORDER BY ic.created_at DESC
    `;
    
    const { rows } = await queryDatabase(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching invite codes:", error);
    res.status(500).json({ message: "Failed to retrieve invite codes." });
  }
}

// POST /api/admin/invite-codes
export async function generateInviteCode(req, res) {
  const { expiresAt } = req.body;
  const code = randomBytes(8).toString("hex").toUpperCase();
  
  try {
    const query = `
      INSERT INTO invite_codes (code, expires_at, created_by_admin_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const { rows } = await queryDatabase(query, [code, expiresAt, req.user.id]);
    
    await logAction({
      adminUserId: req.user.id,
      action: "invite_code.generate",
      details: { code, expiresAt },
      ipAddress: req.ip,
    });
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error generating invite code:", error);
    res.status(500).json({ message: "Failed to generate invite code." });
  }
}

// DELETE /api/admin/invite-codes/:codeId
export async function deleteInviteCode(req, res) {
  const { codeId } = req.params;
  
  try {
    const query = `
      DELETE FROM invite_codes 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows } = await queryDatabase(query, [codeId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Invite code not found." });
    }
    
    await logAction({
      adminUserId: req.user.id,
      action: "invite_code.delete",
      details: { deletedCode: rows[0].code },
      ipAddress: req.ip,
    });
    
    res.status(200).json({ message: "Invite code deleted successfully." });
  } catch (error) {
    console.error("Error deleting invite code:", error);
    res.status(500).json({ message: "Failed to delete invite code." });
  }
}
