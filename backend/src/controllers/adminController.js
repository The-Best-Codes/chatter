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
