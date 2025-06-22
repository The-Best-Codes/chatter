import { Router } from "express";
import {
  clearNotifications,
  getNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/clear", clearNotifications);

export default router;
