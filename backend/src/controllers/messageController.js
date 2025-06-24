import {
  addReaction as addReactionFromModel,
  findRoomForMessage as findRoomForMessageFromModel,
  getReactionsForMessage as getReactionsForMessageFromModel,
  removeReaction as removeReactionFromModel,
} from "../models/messageModel.js";
import { isUserInRoom } from "../models/roomModel.js";
import { broadcastToRoom } from "../services/websocketService.js";

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
    const messageRoom = await findRoomForMessageFromModel(messageId);
    if (!messageRoom) {
      return res.status(404).json({ message: "Message not found." });
    }

    const isMember = await isUserInRoom(userId, messageRoom.room_id);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    await addReactionFromModel(messageId, userId, emojiCode);

    // Get the updated list of reactions to broadcast
    const updatedReactions = await getReactionsForMessageFromModel(messageId);

    // Broadcast the change to the room
    await broadcastToRoom(messageRoom.room_id, "reaction_changed", {
      messageId,
      roomId: messageRoom.room_id,
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
    const messageRoom = await findRoomForMessageFromModel(messageId);
    if (!messageRoom)
      return res.status(404).json({ message: "Message not found." });

    const isMember = await isUserInRoom(userId, messageRoom.room_id);
    if (!isMember)
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });

    await removeReactionFromModel(messageId, userId, emojiCode);

    const updatedReactions = await getReactionsForMessageFromModel(messageId);

    await broadcastToRoom(messageRoom.room_id, "reaction_changed", {
      messageId,
      roomId: messageRoom.room_id,
      reactions: updatedReactions,
    });

    res.status(200).json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({ message: "Failed to remove reaction." });
  }
}
