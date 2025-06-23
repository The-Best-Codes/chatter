import { Router } from "express";
import {
  createOrGetDmRoom,
  getMessagesForRoom,
  pinMessage,
  getUserRooms,
  createNewRoom,
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

router.post("/:roomId/pins", pinMessage);

export default router;
