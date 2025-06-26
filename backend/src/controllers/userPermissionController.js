import { getUserPermissions, updateUserPermissions } from "../services/permissionService.js";

// GET /api/user/permissions
export async function getMyPermissions(req, res) {
  try {
    const permissions = await getUserPermissions(req.user.id);
    res.status(200).json({ permissions });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ message: "Failed to retrieve permissions." });
  }
}

// PUT /api/user/permissions (admin only)
export async function updateUserPermissionsController(req, res) {
  const { userId, permissions } = req.body;
  
  if (!userId || !permissions) {
    return res.status(400).json({ 
      message: "userId and permissions are required." 
    });
  }

  try {
    const result = await updateUserPermissions(userId, permissions);
    res.status(200).json({ 
      message: "Permissions updated successfully",
      permissions: result 
    });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    res.status(500).json({ message: "Failed to update permissions." });
  }
}