import { getMessagesByRoomId, pin, unpin, getPinnedMessagesByRoomId } from "../models/messageModel.js";
import {
  isBlocked as _isBlocked,
  findOrCreateDmRoom,
  isUserInRoom,
  getRoomsForUser,
  createRoom,
} from "../models/roomModel.js";
import { canPinMessage } from "../services/permissionService.js";

// GET /api/rooms
export async function getUserRooms(req, res) {
  const userId = req.user.id;

  try {
    const rooms = await getRoomsForUser(userId);
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ message: "Failed to fetch rooms." });
  }
}

// POST /api/rooms
export async function createNewRoom(req, res) {
  const { name, type = "main_chat" } = req.body;
  const creatorId = req.user.id;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: "Room name is required." });
  }

  try {
    const newRoom = await createRoom(name.trim(), type, creatorId);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Failed to create room." });
  }
}

// GET /api/rooms/:roomId/messages
export async function getMessagesForRoom(req, res) {
  const { roomId } = req.params;
  const { before, limit = 50 } = req.query;
  const userId = req.user.id;

  try {
    const isMember = await isUserInRoom(userId, roomId);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    const messages = await getMessagesByRoomId(roomId, limit, before);
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages." });
  }
}

// POST /api/rooms/dm
export async function createOrGetDmRoom(req, res) {
  const { targetUserId } = req.body;
  const currentUserId = req.user.id;

  if (!targetUserId || targetUserId === currentUserId) {
    return res
      .status(400)
      .json({ message: "Valid target user ID is required." });
  }

  try {
    const isBlocked = await _isBlocked(currentUserId, targetUserId);
    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "You cannot start a DM with this user." });
    }

    const room = await findOrCreateDmRoom(currentUserId, targetUserId);
    res.status(200).json(room);
  } catch (error) {
    console.error("Error creating DM room:", error);
    res.status(500).json({ message: "Failed to create DM room." });
  }
}

// POST /api/rooms/:roomId/pins
export async function pinMessage(req, res) {
  const { roomId } = req.params;
  const { messageId } = req.body;

  // Check if user has permission to pin messages in this room
  const canPin = await canPinMessage(req.user.id, roomId);
  if (!canPin) {
    return res.status(403).json({
      message: "You do not have permission to pin messages in this room.",
    });
  }

  try {
    await pin(roomId, messageId, req.user.id);
    res.status(201).json({ message: "Message pinned." });
  } catch (error) {
    console.error("Pin message error:", error);
    res.status(500).json({ message: "Failed to pin message." });
  }
}

// DELETE /api/rooms/:roomId/pins/:messageId
// TODO: Don't let users unpin other user's pinned messages?
export async function unpinMessage(req, res) {
  const { roomId, messageId } = req.params;

  // Check if user has permission to pin messages in this room
  const canPin = await canPinMessage(req.user.id, roomId);
  if (!canPin) {
    return res.status(403).json({
      message: "You do not have permission to unpin messages in this room.",
    });
  }

  try {
    await unpin(roomId, messageId);
    res.status(200).json({ message: "Message unpinned." });
  } catch (error) {
    console.error("Unpin message error:", error);
    res.status(500).json({ message: "Failed to unpin message." });
  }
}

// GET /api/rooms/:roomId/pins
// Get pinned messages in a room
export async function getPinnedMessages(req, res) {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const isMember = await isUserInRoom(userId, roomId);
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this room." });
    }

    const pinnedMessages = await getPinnedMessagesByRoomId(roomId);
    res.status(200).json(pinnedMessages);
  } catch (error) {
    console.error("Error fetching pinned messages:", error);
    res.status(500).json({ message: "Failed to fetch pinned messages." });
  }
}
