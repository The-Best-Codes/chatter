import { Router } from "express";
import { addReaction, removeReaction } from "../controllers/messageController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.post("/:messageId/reactions", addReaction);
router.delete("/:messageId/reactions", removeReaction); // Using DELETE method is more semantic

export default router;
