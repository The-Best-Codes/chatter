import { query as _query } from "../config/db.js";

// Cache for default permissions to avoid repeated DB queries
let defaultPermissionsCache = null;

/**
 * Get default permissions from app settings
 */
export const getDefaultPermissions = async () => {
  if (defaultPermissionsCache) {
    return defaultPermissionsCache;
  }

  const { rows } = await _query(
    "SELECT setting_value FROM app_settings WHERE setting_key = 'default_permissions'",
  );

  if (rows.length > 0) {
    defaultPermissionsCache = rows[0].setting_value;
    return defaultPermissionsCache;
  }

  // Fallback default permissions if not found in DB
  defaultPermissionsCache = {
    can_send_messages: true,
    can_dm_users: true,
    can_send_attachments: true,
    max_attachment_size_kb: 10240,
    max_message_length: 2000,
    can_edit_messages: true,
    can_delete_messages: true,
    can_react_to_messages: true,
    message_rate_limit: 10,
  };

  return defaultPermissionsCache;
};

/**
 * Get user-specific permissions, falling back to defaults
 */
export const getUserPermissions = async (userId) => {
  const defaultPerms = await getDefaultPermissions();

  // Get user-specific permission overrides
  const { rows } = await _query(
    "SELECT * FROM user_permissions WHERE user_id = $1",
    [userId],
  );

  if (rows.length === 0) {
    return defaultPerms;
  }

  const userPerms = rows[0];

  // Merge user permissions with defaults (user overrides take precedence)
  return {
    can_send_messages:
      userPerms.can_send_messages ?? defaultPerms.can_send_messages,
    can_dm_users: userPerms.can_dm_users ?? defaultPerms.can_dm_users,
    can_send_attachments:
      userPerms.can_send_attachments ?? defaultPerms.can_send_attachments,
    max_attachment_size_kb:
      userPerms.max_attachment_size_kb ?? defaultPerms.max_attachment_size_kb,
    max_message_length:
      userPerms.max_message_length ?? defaultPerms.max_message_length,
    can_edit_messages:
      userPerms.can_edit_messages ?? defaultPerms.can_edit_messages,
    can_delete_messages:
      userPerms.can_delete_messages ?? defaultPerms.can_delete_messages,
    can_react_to_messages:
      userPerms.can_react_to_messages ?? defaultPerms.can_react_to_messages,
    message_rate_limit:
      userPerms.message_rate_limit ?? defaultPerms.message_rate_limit,
  };
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (userId, permission) => {
  const permissions = await getUserPermissions(userId);
  return permissions[permission] === true;
};

/**
 * Clear the permissions cache (useful when default permissions are updated)
 */
export const clearPermissionsCache = () => {
  defaultPermissionsCache = null;
};

/**
 * Check if user can pin messages in a room
 * Checks both user permissions and room-specific rules
 */
export const canPinMessage = async (userId, roomId) => {
  // Check if user has general permission to perform moderation actions
  const userPerms = await getUserPermissions(userId);

  // Get user info to check role
  const { rows } = await _query("SELECT role FROM users WHERE id = $1", [
    userId,
  ]);
  if (rows.length === 0) {
    return false;
  }

  const userRole = rows[0].role;

  // Admins can pin messages in any room
  if (userRole === "admin") {
    return true;
  }

  // For now, only allow pinning in the main room for regular users
  // In the future, this could be expanded to check room-specific permissions
  if (roomId === "00000000-0000-0000-0000-000000000001") {
    // Only allow users with messaging permissions to pin in main room
    return userPerms.can_send_messages === true;
  }

  // For other rooms (like DMs), don't allow pinning for now
  return false;
};
