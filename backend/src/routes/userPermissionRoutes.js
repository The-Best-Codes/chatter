import { Router } from "express";
import { 
  getMyPermissions, 
  updateUserPermissionsController 
} from "../controllers/userPermissionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

const router = Router();

router.use(protect);

// Get current user's permissions
router.get("/permissions", getMyPermissions);

// Update user permissions (admin only)
router.put("/permissions", isAdmin, updateUserPermissionsController);

export default router;