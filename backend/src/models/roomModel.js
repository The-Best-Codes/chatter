const db = require("../config/db");

const Room = {};

Room.isUserInRoom = async (userId, roomId) => {
  const query =
    "SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2";
  const { rows } = await db.query(query, [userId, roomId]);
  return rows.length > 0;
};

Room.getRoomsForUser = async (userId) => {
  const query = `
        SELECT r.id, r.type, r.name FROM rooms r
        JOIN room_members rm ON r.id = rm.room_id
        WHERE rm.user_id = $1;
    `;
  const { rows } = await db.query(query, [userId]);
  return rows;
};

Room.getRoomMemberIds = async (roomId) => {
  const query = "SELECT user_id FROM room_members WHERE room_id = $1";
  const { rows } = await db.query(query, [roomId]);
  return rows.map((r) => r.user_id);
};

Room.findOrCreateDmRoom = async (userId1, userId2) => {
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
  const { rows } = await db.query(findQuery, [u1, u2]);
  if (rows.length > 0) {
    // We found an existing room, return it
    return rows[0];
  }

  // No existing room, so create a new one in a transaction
  const client = await db.getPool().connect();
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

Room.isBlocked = async (userId1, userId2) => {
  // Check if either user has blocked the other
  const query = `
        SELECT 1 FROM blocked_users
        WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
           OR (blocker_user_id = $2 AND blocked_user_id = $1);
    `;
  const { rows } = await db.query(query, [userId1, userId2]);
  return rows.length > 0;
};

module.exports = Room;
