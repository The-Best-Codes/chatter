import { query as _query, getPool } from "../config/db.js";

export const isUserInRoom = async (userId, roomId) => {
  const query =
    "SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2";
  const { rows } = await _query(query, [userId, roomId]);
  return rows.length > 0;
};

export const getRoomsForUser = async (userId) => {
  const query = `
        SELECT 
          r.id, 
          r.type, 
          r.name,
          r.created_at,
          CASE 
            WHEN r.type = 'dm' THEN (
              SELECT json_build_object(
                'id', u.id,
                'username', u.username,
                'display_name', u.display_name,
                'avatar_url', u.avatar_url
              )
              FROM users u
              JOIN room_members rm2 ON u.id = rm2.user_id
              WHERE rm2.room_id = r.id AND rm2.user_id != $1
              LIMIT 1
            )
            ELSE NULL
          END as other_user
        FROM rooms r
        JOIN room_members rm ON r.id = rm.room_id
        WHERE rm.user_id = $1
        ORDER BY r.created_at DESC;
    `;
  const { rows } = await _query(query, [userId]);
  return rows;
};

export const getRoomMemberIds = async (roomId) => {
  const query = "SELECT user_id FROM room_members WHERE room_id = $1";
  const { rows } = await _query(query, [roomId]);
  return rows.map((r) => r.user_id);
};

export const findOrCreateDmRoom = async (userId1, userId2) => {
  // To keep it consistent, always store the smaller ID first
  const [u1, u2] = [userId1, userId2].sort();

  // First, try to find an existing DM room between these two users
  const findQuery = `
        SELECT r.id, r.type, r.name FROM rooms r
        JOIN room_members rm1 ON r.id = rm1.room_id
        JOIN room_members rm2 ON r.id = rm2.room_id
        WHERE r.type = 'dm'
          AND rm1.user_id = $1
          AND rm2.user_id = $2;
    `;
  const { rows } = await _query(findQuery, [u1, u2]);
  if (rows.length > 0) {
    // We found an existing room, return it
    return rows[0];
  }

  // No existing room, so create a new one in a transaction
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Step 1: Create the new DM room
    const roomInsertQuery = `INSERT INTO rooms (type) VALUES ('dm') RETURNING id, type, name;`;
    const roomResult = await client.query(roomInsertQuery);
    const newRoom = roomResult.rows[0];

    // Step 2: Add both users as members of the new room
    const memberInsertQuery = `INSERT INTO room_members (user_id, room_id) VALUES ($1, $2), ($3, $2);`;
    await client.query(memberInsertQuery, [u1, newRoom.id, u2]);

    await client.query("COMMIT");
    return newRoom;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

export const createRoom = async (name, type = "main_chat", creatorId) => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Create the room
    const roomInsertQuery = `
      INSERT INTO rooms (name, type) 
      VALUES ($1, $2) 
      RETURNING id, name, type, created_at;
    `;
    const roomResult = await client.query(roomInsertQuery, [name, type]);
    const newRoom = roomResult.rows[0];

    // Add the creator as a member
    const memberInsertQuery = `INSERT INTO room_members (user_id, room_id) VALUES ($1, $2);`;
    await client.query(memberInsertQuery, [creatorId, newRoom.id]);

    await client.query("COMMIT");
    return newRoom;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

export const isBlocked = async (userId1, userId2) => {
  // Check if either user has blocked the other
  const query = `
        SELECT 1 FROM blocked_users
        WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
           OR (blocker_user_id = $2 AND blocked_user_id = $1);
    `;
  const { rows } = await _query(query, [userId1, userId2]);
  return rows.length > 0;
};
