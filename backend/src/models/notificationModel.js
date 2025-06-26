import { query as _query } from "../config/db.js";
import { broadcastToUser } from "../services/websocketService.js";

export const getUnreadForUser = async (userId) => {
  const query = `
        SELECT
            n.id,
            n.type,
            n.room_id,
            r.name as room_name,
            n.source_message_id,
            n.source_user_id,
            u.username as source_username,
            n.created_at
        FROM notifications n
        LEFT JOIN users u ON n.source_user_id = u.id
        LEFT JOIN rooms r ON n.room_id = r.id
        WHERE n.recipient_user_id = $1 AND n.is_cleared = false
        ORDER BY n.created_at DESC;
    `;
  const { rows } = await _query(query, [userId]);
  return rows;
};

export const getUnreadCountForUser = async (userId) => {
  const query =
    "SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_cleared = false;";
  const { rows } = await _query(query, [userId]);
  return parseInt(rows[0].count, 10);
};

export const clearByIds = async (notificationIds, userId) => {
  if (!notificationIds || notificationIds.length === 0) {
    return { clearedCount: 0 };
  }
  const query = `
        UPDATE notifications
        SET is_cleared = true
        WHERE id = ANY($1::bigint[]) AND recipient_user_id = $2;
    `;
  // We ensure the user can only clear their own notifications.
  const { rowCount } = await _query(query, [notificationIds, userId]);
  
  if (rowCount > 0) {
    // Get updated notification count and broadcast to user
    const newCount = await getUnreadCountForUser(userId);
    broadcastToUser(userId, "notifications_updated", {
      unreadCount: newCount,
      clearedIds: notificationIds
    });
  }
  
  return { clearedCount: rowCount };
};

/**
 * Create a new notification and broadcast it to the user
 */
export const createNotification = async (recipientUserId, type, sourceMessageId, sourceUserId, roomId) => {
  const query = `
    INSERT INTO notifications (recipient_user_id, type, source_message_id, source_user_id, room_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, type, room_id, source_message_id, source_user_id, created_at;
  `;
  
  const { rows } = await _query(query, [recipientUserId, type, sourceMessageId, sourceUserId, roomId]);
  const notification = rows[0];
  
  if (notification) {
    // Get additional notification details
    const detailQuery = `
      SELECT
        n.id,
        n.type,
        n.room_id,
        r.name as room_name,
        n.source_message_id,
        n.source_user_id,
        u.username as source_username,
        u.display_name as source_display_name,
        n.created_at
      FROM notifications n
      LEFT JOIN users u ON n.source_user_id = u.id
      LEFT JOIN rooms r ON n.room_id = r.id
      WHERE n.id = $1;
    `;
    
    const { rows: detailRows } = await _query(detailQuery, [notification.id]);
    const detailedNotification = detailRows[0];
    
    // Get updated notification count
    const newCount = await getUnreadCountForUser(recipientUserId);
    
    // Broadcast new notification to user
    broadcastToUser(recipientUserId, "new_notification", {
      notification: detailedNotification,
      unreadCount: newCount
    });
    
    return detailedNotification;
  }
  
  return null;
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  const query = `
    UPDATE notifications
    SET is_cleared = true
    WHERE id = $1 AND recipient_user_id = $2
    RETURNING id;
  `;
  
  const { rows } = await _query(query, [notificationId, userId]);
  
  if (rows.length > 0) {
    // Get updated notification count and broadcast to user
    const newCount = await getUnreadCountForUser(userId);
    broadcastToUser(userId, "notifications_updated", {
      unreadCount: newCount,
      clearedIds: [notificationId]
    });
    
    return { success: true };
  }
  
  return { success: false };
};
