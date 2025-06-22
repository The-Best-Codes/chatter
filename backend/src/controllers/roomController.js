const Room = require("../models/roomModel");
const Message = require("../models/messageModel");

// GET /api/rooms/:roomId/messages
exports.getMessagesForRoom = async (req, res) => {
  const { roomId } = req.params;
  const { before, limit = 50 } = req.query;
  const userId = req.user.id;

  try {
    const isMember = await Room.isUserInRoom(userId, roomId);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    const messages = await Message.getMessagesByRoomId(roomId, limit, before);
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages." });
  }
};

// POST /api/rooms/dm
exports.createOrGetDmRoom = async (req, res) => {
  const { targetUserId } = req.body;
  const currentUserId = req.user.id;

  if (!targetUserId || targetUserId === currentUserId) {
    return res
      .status(400)
      .json({ message: "Valid target user ID is required." });
  }

  try {
    const isBlocked = await Room.isBlocked(currentUserId, targetUserId);
    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "You cannot start a DM with this user." });
    }

    const room = await Room.findOrCreateDmRoom(currentUserId, targetUserId);
    res.status(200).json(room);
  } catch (error) {
    console.error("Error creating DM room:", error);
    res.status(500).json({ message: "Failed to create DM room." });
  }
};

// POST /api/rooms/:roomId/pins
exports.pinMessage = async (req, res) => {
  const { roomId } = req.params;
  const { messageId } = req.body;

  // TODO: Add permission checks here. For now, only allow in main room.
  if (roomId !== "00000000-0000-0000-0000-000000000001") {
    return res
      .status(403)
      .json({ message: "Message pinning is only allowed in the main room." });
  }

  try {
    await Message.pin(roomId, messageId, req.user.id);
    res.status(201).json({ message: "Message pinned." });
  } catch (error) {
    console.error("Pin message error:", error);
    res.status(500).json({ message: "Failed to pin message." });
  }
};
