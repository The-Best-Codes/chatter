import { Router } from "express";
import {
  deleteUser,
  generatePasswordResetCode,
  getAppSettings,
  listUsers,
  updateAppSettings,
  updateUserPermissions,
  updateUserStatus,
} from "../controllers/adminController";
import { isAdmin } from "../middleware/adminMiddleware";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// Apply both middlewares to all routes in this file
router.use(protect, isAdmin);

// Settings Routes
router.get("/settings", getAppSettings);
router.put("/settings", updateAppSettings);

// User Management Routes
router.get("/users", listUsers);
router.post("/users/:userId/status", updateUserStatus);
router.delete("/users/:userId", deleteUser);

router.put("/users/:userId/permissions", updateUserPermissions);
router.post("/users/:userId/password-reset", generatePasswordResetCode);

export default router;
