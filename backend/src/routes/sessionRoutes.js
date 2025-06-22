import { Router } from "express";
import {
  getActiveSessions,
  logoutSession,
} from "../controllers/sessionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getActiveSessions);
router.delete("/:sessionId", logoutSession);

export default router;
