import { Router } from "express";
import {
  blockUser,
  searchUsers,
  unblockUser,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// All routes in this file will be protected by our auth middleware
router.use(protect);

// GET /api/users?search=...
router.get("/", searchUsers);
router.post("/:userId/block", blockUser);
router.delete("/:userId/block", unblockUser);

export default router;
