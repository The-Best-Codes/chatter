import { Router } from "express";
import {
  clearNotifications,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/clear", clearNotifications);
router.post("/:id/read", markNotificationAsRead);

export default router;
