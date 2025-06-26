import { query as _query } from "../config/db.js";

export const getSettings = async () => {
  const { rows } = await _query(
    "SELECT setting_key, setting_value FROM app_settings",
  );
  // Convert array of objects to a single key-value object
  const settings = rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
  return settings;
};

export const updateSetting = async (key, value) => {
  const query = `
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        RETURNING *;
    `;
  const { rows } = await _query(query, [key, value]);
  return rows[0];
};

export const getAllUsers = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const query = `
        SELECT 
          u.id, 
          u.username, 
          u.display_name, 
          u.role, 
          u.status, 
          u.created_at,
          up.can_send_messages,
          up.can_dm_users,
          up.can_send_attachments,
          up.max_attachment_size_kb,
          up.max_message_length,
          up.can_edit_messages,
          up.can_delete_messages,
          up.can_react_to_messages,
          up.message_rate_limit
        FROM users u
        LEFT JOIN user_permissions up ON u.id = up.user_id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2;
    `;
  const totalQuery = "SELECT COUNT(*) FROM users;";

  const [usersResult, totalResult] = await Promise.all([
    _query(query, [limit, offset]),
    _query(totalQuery),
  ]);

  // Transform the results to include permissions as a nested object
  const users = usersResult.rows.map(user => {
    const { 
      can_send_messages,
      can_dm_users,
      can_send_attachments,
      max_attachment_size_kb,
      max_message_length,
      can_edit_messages,
      can_delete_messages,
      can_react_to_messages,
      message_rate_limit,
      ...userData 
    } = user;

    // Only include permissions if they exist (not null)
    const permissions = {};
    if (can_send_messages !== null) permissions.can_send_messages = can_send_messages;
    if (can_dm_users !== null) permissions.can_dm_users = can_dm_users;
    if (can_send_attachments !== null) permissions.can_send_attachments = can_send_attachments;
    if (max_attachment_size_kb !== null) permissions.max_attachment_size_kb = max_attachment_size_kb;
    if (max_message_length !== null) permissions.max_message_length = max_message_length;
    if (can_edit_messages !== null) permissions.can_edit_messages = can_edit_messages;
    if (can_delete_messages !== null) permissions.can_delete_messages = can_delete_messages;
    if (can_react_to_messages !== null) permissions.can_react_to_messages = can_react_to_messages;
    if (message_rate_limit !== null) permissions.message_rate_limit = message_rate_limit;

    return {
      ...userData,
      permissions: Object.keys(permissions).length > 0 ? permissions : null
    };
  });

  return {
    users,
    total: parseInt(totalResult.rows[0].count, 10),
    page,
    limit,
  };
};

export const updateUserStatus = async (userId, status) => {
  const query = `
        UPDATE users SET status = $1, updated_at = NOW()
        WHERE id = $2 RETURNING id, status;
    `;
  const { rows } = await _query(query, [status, userId]);
  return rows[0];
};

export const softDeleteUser = async (userId) => {
  // A soft delete sets the status to 'deleted' and anonymizes some data.
  const query = `
        UPDATE users
        SET
            status = 'deleted',
            username = 'deleted_user_' || id::text,
            display_name = 'Deleted User',
            hashed_password = 'deleted',
            updated_at = NOW()
        WHERE id = $1 RETURNING id, status;
    `;
  const { rows } = await _query(query, [userId]);
  return rows[0];
};

export const updatePermissionsForUser = async (userId, perms) => {
  // This is a complex dynamic query. Be careful.
  const fields = Object.keys(perms);
  const values = Object.values(perms);

  if (fields.length === 0) return {};

  const setClauses = fields
    .map((field, i) => `${field} = $${i + 2}`)
    .join(", ");

  const query = `
        INSERT INTO user_permissions (user_id, ${fields.join(", ")}, updated_at)
        VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(", ")}, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET ${setClauses}, updated_at = NOW()
        RETURNING *;
    `;

  const { rows } = await _query(query, [userId, ...values]);
  return rows[0];
};
