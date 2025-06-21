const db = require('../config/db');

const Message = {};

Message.create = async (messageData) => {
    const { senderId, roomId, encryptedContent, replyToMessageId = null, mentionedUserIds = [] } = messageData;

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');

        // Insert the message
        const messageQuery = `
            INSERT INTO messages (sender_id, room_id, encrypted_content, reply_to_message_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, room_id, sender_id, encrypted_content, reply_to_message_id, created_at;
        `;
        const messageResult = await client.query(messageQuery, [senderId, roomId, encryptedContent, replyToMessageId]);
        const newMessage = messageResult.rows[0];

        // Create notifications for mentions
        if (mentionedUserIds && mentionedUserIds.length > 0) {
            const notificationQuery = `
                INSERT INTO notifications (recipient_user_id, type, source_message_id, source_user_id, room_id)
                VALUES ($1, 'mention', $2, $3, $4);
            `;
            for (const recipientId of mentionedUserIds) {
                // Don't notify someone for mentioning themselves
                if (recipientId !== senderId) {
                    await client.query(notificationQuery, [recipientId, newMessage.id, senderId, roomId]);
                }
            }
        }

        // TODO: Create notifications for replies

        await client.query('COMMIT');

        // Fetch sender's info to attach to the message object for broadcasting
        const senderQuery = 'SELECT username, display_name FROM users WHERE id = $1';
        const { rows: senderRows } = await db.query(senderQuery, [newMessage.sender_id]);

        return {
            ...newMessage,
            sender: senderRows[0]
        };

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error creating message:", e);
        throw e;
    } finally {
        client.release();
    }
};

Message.getMessagesByRoomId = async (roomId, limit = 50, beforeId = null) => {
    let query = `
        SELECT m.id, m.room_id, m.sender_id, m.encrypted_content, m.reply_to_message_id, m.created_at, u.username, u.display_name, u.avatar_url
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.room_id = $1 AND m.deleted_at IS NULL
    `;
    const params = [roomId];

    if (beforeId) {
        query += ` AND m.id < $${params.length + 1}`;
        params.push(beforeId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await db.query(query, params);

    // We reverse the result so they are in chronological order for the client
    return rows.reverse();
};

module.exports = Message;
