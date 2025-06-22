import { query as _query } from "../config/db.js";

const Notification = {};

Notification.getUnreadForUser = async (userId) => {
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

Notification.getUnreadCountForUser = async (userId) => {
  const query =
    "SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_cleared = false;";
  const { rows } = await _query(query, [userId]);
  return parseInt(rows[0].count, 10);
};

Notification.clearByIds = async (notificationIds, userId) => {
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
  return { clearedCount: rowCount };
};

export default Notification;
