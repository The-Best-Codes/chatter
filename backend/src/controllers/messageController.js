const Message = require("../models/messageModel");
const Room = require("../models/roomModel");
const websocketService = require("../services/websocketService");

// POST /api/messages/:messageId/reactions
exports.addReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emojiCode } = req.body;
  const userId = req.user.id;

  if (!emojiCode) {
    return res.status(400).json({ message: "emojiCode is required." });
  }

  try {
    // Find which room the message is in to check membership and for broadcasting
    const messageRoom = await Message.findRoomForMessage(messageId);
    if (!messageRoom) {
      return res.status(404).json({ message: "Message not found." });
    }

    const isMember = await Room.isUserInRoom(userId, messageRoom.room_id);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    await Message.addReaction(messageId, userId, emojiCode);

    // Get the updated list of reactions to broadcast
    const updatedReactions = await Message.getReactionsForMessage(messageId);

    // Broadcast the change to the room
    await websocketService.broadcastToRoom(
      messageRoom.room_id,
      "reaction_changed",
      {
        messageId,
        reactions: updatedReactions,
      },
    );

    res.status(201).json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ message: "Failed to add reaction." });
  }
};

// DELETE /api/messages/:messageId/reactions
exports.removeReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emojiCode } = req.body;
  const userId = req.user.id;

  if (!emojiCode) {
    return res.status(400).json({ message: "emojiCode is required." });
  }

  try {
    const messageRoom = await Message.findRoomForMessage(messageId);
    if (!messageRoom)
      return res.status(404).json({ message: "Message not found." });

    const isMember = await Room.isUserInRoom(userId, messageRoom.room_id);
    if (!isMember)
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });

    await Message.removeReaction(messageId, userId, emojiCode);

    const updatedReactions = await Message.getReactionsForMessage(messageId);

    await websocketService.broadcastToRoom(
      messageRoom.room_id,
      "reaction_changed",
      {
        messageId,
        reactions: updatedReactions,
      },
    );

    res.status(200).json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({ message: "Failed to remove reaction." });
  }
};
