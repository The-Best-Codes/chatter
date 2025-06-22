import {
  addReaction,
  findRoomForMessage,
  getReactionsForMessage,
  removeReaction,
} from "../models/messageModel";
import { isUserInRoom } from "../models/roomModel";
import { broadcastToRoom } from "../services/websocketService";

// POST /api/messages/:messageId/reactions
export async function addReaction(req, res) {
  const { messageId } = req.params;
  const { emojiCode } = req.body;
  const userId = req.user.id;

  if (!emojiCode) {
    return res.status(400).json({ message: "emojiCode is required." });
  }

  try {
    // Find which room the message is in to check membership and for broadcasting
    const messageRoom = await findRoomForMessage(messageId);
    if (!messageRoom) {
      return res.status(404).json({ message: "Message not found." });
    }

    const isMember = await isUserInRoom(userId, messageRoom.room_id);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    await addReaction(messageId, userId, emojiCode);

    // Get the updated list of reactions to broadcast
    const updatedReactions = await getReactionsForMessage(messageId);

    // Broadcast the change to the room
    await broadcastToRoom(messageRoom.room_id, "reaction_changed", {
      messageId,
      reactions: updatedReactions,
    });

    res.status(201).json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ message: "Failed to add reaction." });
  }
}

// DELETE /api/messages/:messageId/reactions
export async function removeReaction(req, res) {
  const { messageId } = req.params;
  const { emojiCode } = req.body;
  const userId = req.user.id;

  if (!emojiCode) {
    return res.status(400).json({ message: "emojiCode is required." });
  }

  try {
    const messageRoom = await findRoomForMessage(messageId);
    if (!messageRoom)
      return res.status(404).json({ message: "Message not found." });

    const isMember = await isUserInRoom(userId, messageRoom.room_id);
    if (!isMember)
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });

    await removeReaction(messageId, userId, emojiCode);

    const updatedReactions = await getReactionsForMessage(messageId);

    await broadcastToRoom(messageRoom.room_id, "reaction_changed", {
      messageId,
      reactions: updatedReactions,
    });

    res.status(200).json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({ message: "Failed to remove reaction." });
  }
}
