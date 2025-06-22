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
        SELECT id, username, display_name, role, status, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
    `;
  const totalQuery = "SELECT COUNT(*) FROM users;";

  const [usersResult, totalResult] = await Promise.all([
    _query(query, [limit, offset]),
    _query(totalQuery),
  ]);

  return {
    users: usersResult.rows,
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
