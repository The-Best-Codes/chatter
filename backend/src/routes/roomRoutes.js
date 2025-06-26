import { Router } from "express";
import {
  createNewRoom,
  createOrGetDmRoom,
  getMessagesForRoom,
  getUserRooms,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Protect all routes in this file
router.use(protect);

// GET /api/rooms - to get all rooms for the current user
router.get("/", getUserRooms);

// POST /api/rooms - to create a new room
router.post("/", createNewRoom);

// POST /api/rooms/dm - to create/get a DM room
router.post("/dm", createOrGetDmRoom);

// GET /api/rooms/:roomId/messages - to get message history
router.get("/:roomId/messages", getMessagesForRoom);

// GET /api/rooms/:roomId/pins - to get pinned messages in a room
router.get("/:roomId/pins", getPinnedMessages);

// POST /api/rooms/:roomId/pins - to pin a message in a room
router.post("/:roomId/pins", pinMessage);

// DELETE /api/rooms/:roomId/pins/:messageId - to unpin a message in a room
router.delete("/:roomId/pins/:messageId", unpinMessage);

export default router;
