const db = require('../config/db');
const bcrypt = require('bcrypt');

const User = {};

User.create = async (userData) => {
  const { username, displayName, password, publicKeyIdentity, publicKeyBundle } = userData;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const query = `
    INSERT INTO users (username, display_name, hashed_password, public_key_identity, public_key_bundle)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, display_name, created_at, status;
  `;

  // After creating the user, also add them to the main chat room
  const client = await db.getPool().connect();
  try {
      await client.query('BEGIN');
      const userRes = await client.query(query, [username, displayName, hashedPassword, publicKeyIdentity, publicKeyBundle]);
      const newUser = userRes.rows[0];

      const mainRoomId = '00000000-0000-0000-0000-000000000001'; // Hardcoded ID for 'General'
      const roomMemberQuery = `
          INSERT INTO room_members (user_id, room_id) VALUES ($1, $2);
      `;
      await client.query(roomMemberQuery, [newUser.id, mainRoomId]);

      await client.query('COMMIT');
      return newUser;
  } catch (e) {
      await client.query('ROLLBACK');
      throw e;
  } finally {
      client.release();
  }
};

User.findByUsername = async (username) => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const { rows } = await db.query(query, [username]);
  return rows[0];
};

User.findById = async (id) => {
    const query = 'SELECT id, username, display_name, avatar_url, status, created_at FROM users WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
};

User.searchByUsername = async (searchTerm, excludeUserId) => {
    const query = `
        SELECT id, username, display_name, avatar_url
        FROM users
        WHERE username ILIKE $1 AND id != $2 AND status = 'active'
        LIMIT 10;
    `;
    // ILIKE is a case-insensitive search
    const { rows } = await db.query(query, [`%${searchTerm}%`, excludeUserId]);
    return rows;
};

module.exports = User;
