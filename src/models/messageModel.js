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

module.exports = Message;
