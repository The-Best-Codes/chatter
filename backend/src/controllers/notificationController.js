import {
  clearByIds,
  getUnreadCountForUser,
  getUnreadForUser,
  markAsRead,
} from "../models/notificationModel.js";

// GET /api/notifications
export async function getNotifications(req, res) {
  try {
    const [notifications, count] = await Promise.all([
      getUnreadForUser(req.user.id),
      getUnreadCountForUser(req.user.id),
    ]);
    res.status(200).json({ count, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to retrieve notifications." });
  }
}

// POST /api/notifications/clear
export async function clearNotifications(req, res) {
  const { notificationIds } = req.body;
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res
      .status(400)
      .json({ message: "notificationIds must be a non-empty array." });
  }

  try {
    const result = await clearByIds(notificationIds, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ message: "Failed to clear notifications." });
  }
}

// POST /api/notifications/:id/read
export async function markNotificationAsRead(req, res) {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ message: "Notification ID is required." });
  }

  try {
    const result = await markAsRead(id, req.user.id);
    if (result.success) {
      res.status(200).json({ message: "Notification marked as read." });
    } else {
      res.status(404).json({ message: "Notification not found." });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read." });
  }
}
