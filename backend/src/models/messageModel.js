import { query as _query, getPool } from "../config/db.js";

export const create = async (messageData) => {
  const {
    senderId,
    roomId,
    encryptedContent,
    replyToMessageId = null,
    mentionedUserIds = [],
  } = messageData;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Insert the message
    const messageQuery = `
            INSERT INTO messages (sender_id, room_id, encrypted_content, reply_to_message_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, room_id, sender_id, encrypted_content, reply_to_message_id, created_at;
        `;
    const messageResult = await client.query(messageQuery, [
      senderId,
      roomId,
      encryptedContent,
      replyToMessageId,
    ]);
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
          await client.query(notificationQuery, [
            recipientId,
            newMessage.id,
            senderId,
            roomId,
          ]);
        }
      }
    }

    // Create notifications for replies
    if (replyToMessageId) {
      // Find the original message sender to notify them
      const originalMessageQuery =
        "SELECT sender_id FROM messages WHERE id = $1";
      const { rows: originalMessageRows } = await client.query(
        originalMessageQuery,
        [replyToMessageId],
      );

      if (originalMessageRows.length > 0) {
        const originalSenderId = originalMessageRows[0].sender_id;

        // Don't notify someone for replying to their own message
        if (originalSenderId !== senderId) {
          const replyNotificationQuery = `
            INSERT INTO notifications (recipient_user_id, type, source_message_id, source_user_id, room_id)
            VALUES ($1, 'reply', $2, $3, $4);
          `;
          await client.query(replyNotificationQuery, [
            originalSenderId,
            newMessage.id,
            senderId,
            roomId,
          ]);
        }
      }
    }

    await client.query("COMMIT");

    // Fetch sender's info to attach to the message object for broadcasting
    const senderQuery =
      "SELECT username, display_name FROM users WHERE id = $1";
    const { rows: senderRows } = await _query(senderQuery, [
      newMessage.sender_id,
    ]);

    return {
      ...newMessage,
      sender: senderRows[0],
    };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error creating message:", e);
    throw e;
  } finally {
    client.release();
  }
};

export const getMessagesByRoomId = async (
  roomId,
  limit = 50,
  beforeId = null,
) => {
  let query = `
        SELECT m.id, m.room_id, m.sender_id, m.encrypted_content, m.reply_to_message_id, m.created_at, m.updated_at, u.username, u.display_name, u.avatar_url,
              p.id IS NOT NULL AS is_pinned,
              COALESCE(
                (
                  SELECT json_agg(r)::jsonb -- Explicitly cast json_agg result to jsonb
                  FROM (
                      SELECT
                          mr.emoji_code as "emoji",
                          COUNT(mr.user_id)::int as "count",
                          json_agg(json_build_object('userId', u_react.id, 'username', u_react.username)) as "users"
                      FROM message_reactions mr
                      JOIN users u_react ON mr.user_id = u_react.id
                      WHERE mr.message_id = m.id
                      GROUP BY mr.emoji_code
                  ) r
                ),
                '[]'::jsonb
              ) as reactions
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN pinned_messages p ON m.id = p.message_id AND p.room_id = m.room_id
        WHERE m.room_id = $1 AND m.deleted_at IS NULL
    `;
  const params = [roomId];

  if (beforeId) {
    query += ` AND m.id < $${params.length + 1}`;
    params.push(beforeId);
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await _query(query, params);

  return rows.reverse();
};

export const findRoomForMessage = async (messageId) => {
  const query = "SELECT room_id FROM messages WHERE id = $1;";
  const { rows } = await _query(query, [messageId]);
  return rows[0];
};

export const edit = async (messageId, userId, newEncryptedContent) => {
  // We only allow a user to edit their own message.
  const query = `
        UPDATE messages
        SET encrypted_content = $1, updated_at = NOW()
        WHERE id = $2 AND sender_id = $3 AND deleted_at IS NULL
        RETURNING id, room_id, encrypted_content, updated_at;
    `;
  const { rows } = await _query(query, [
    newEncryptedContent,
    messageId,
    userId,
  ]);
  return rows[0]; // Will be undefined if no row was updated (wrong user or message deleted)
};

export const softDelete = async (messageId, userId) => {
  // Only the sender can delete their own message. (Admin logic would be separate)
  const query = `
        UPDATE messages
        SET deleted_at = NOW()
        WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL
        RETURNING id, room_id;
    `;
  const { rows } = await _query(query, [messageId, userId]);
  return rows[0];
};

export const addReaction = async (messageId, userId, emojiCode) => {
  const query = `
        INSERT INTO message_reactions (message_id, user_id, emoji_code)
        VALUES ($1, $2, $3)
        ON CONFLICT (message_id, user_id, emoji_code) DO NOTHING;
    `;
  await _query(query, [messageId, userId, emojiCode]);
  return { success: true };
};

export const removeReaction = async (messageId, userId, emojiCode) => {
  const query = `
        DELETE FROM message_reactions
        WHERE message_id = $1 AND user_id = $2 AND emoji_code = $3;
    `;
  await _query(query, [messageId, userId, emojiCode]);
  return { success: true };
};

export const getReactionsForMessage = async (messageId) => {
  // This query aggregates reactions by emoji, counting them and listing who reacted.
  const query = `
        SELECT
            mr.emoji_code as "emoji",
            COUNT(*)::int as "count",
            json_agg(json_build_object('userId', mr.user_id, 'username', u.username)) as "users"
        FROM message_reactions mr
        JOIN users u on mr.user_id = u.id
        WHERE message_id = $1
        GROUP BY mr.emoji_code;
    `;
  const { rows } = await _query(query, [messageId]);
  return rows;
};

export const pin = async (roomId, messageId, userId) => {
  const query = `
        INSERT INTO pinned_messages (room_id, message_id, pinned_by_user_id)
        VALUES ($1, $2, $3) ON CONFLICT (room_id, message_id) DO NOTHING;
    `;
  await _query(query, [roomId, messageId, userId]);
};
