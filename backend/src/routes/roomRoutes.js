import { Router } from "express";
import {
  createOrGetDmRoom,
  getMessagesForRoom,
  pinMessage,
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Protect all routes in this file
router.use(protect);

// POST /api/rooms/dm - to create/get a DM room
router.post("/dm", createOrGetDmRoom);

// GET /api/rooms/:roomId/messages - to get message history
router.get("/:roomId/messages", getMessagesForRoom);

router.post("/:roomId/pins", pinMessage);

export default router;
