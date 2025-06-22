import {
  clearByIds,
  getUnreadCountForUser,
  getUnreadForUser,
} from "../models/notificationModel";

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
