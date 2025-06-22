import { Router } from "express";
import {
  getActiveSessions,
  logoutSession,
} from "../controllers/sessionController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.get("/", getActiveSessions);
router.delete("/:sessionId", logoutSession);

export default router;
