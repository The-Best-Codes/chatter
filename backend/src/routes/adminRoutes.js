import { Router } from "express";
import {
  deleteUser,
  generatePasswordResetCode,
  getAppSettings,
  listUsers,
  updateAppSettings,
  updateUserPermissions,
  updateUserStatus,
  getAuditLogs,
  getInviteCodes,
  generateInviteCode,
  deleteInviteCode,
} from "../controllers/adminController.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

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

// Audit Log Routes
router.get("/audit-logs", getAuditLogs);

// Invite Code Routes
router.get("/invite-codes", getInviteCodes);
router.post("/invite-codes", generateInviteCode);
router.delete("/invite-codes/:codeId", deleteInviteCode);

export default router;
