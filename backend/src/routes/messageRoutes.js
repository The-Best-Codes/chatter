import { Router } from "express";
import { addReaction, removeReaction } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/:messageId/reactions", addReaction);
router.delete("/:messageId/reactions", removeReaction); // Using DELETE method is more semantic

export default router;
