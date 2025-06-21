const db = require('../config/db');

const Room = {};

Room.isUserInRoom = async (userId, roomId) => {
    const query = 'SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2';
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
    const query = 'SELECT user_id FROM room_members WHERE room_id = $1';
    const { rows } = await db.query(query, [roomId]);
    return rows.map(r => r.user_id);
};


module.exports = Room;
