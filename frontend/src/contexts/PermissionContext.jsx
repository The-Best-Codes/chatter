import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import ApiService from "../services/api-service";
import WebSocketService from "../services/websocket-service";

const PermissionContext = createContext();

export function PermissionProvider({ children }) {
  const { user, token } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial permissions
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user || !token) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        const response = await ApiService.getUserPermissions();
        setPermissions(response.permissions);
      } catch (error) {
        console.error("Failed to load permissions:", error);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, token]);

  // Listen for real-time permission updates
  useEffect(() => {
    const handlePermissionsUpdated = (payload) => {
      setPermissions(payload.permissions);
    };

    const handleRoleUpdated = (payload) => {
      setPermissions(payload.permissions);
      // You might also want to update the user role in AuthContext
    };

    WebSocketService.on("permissions_updated", handlePermissionsUpdated);
    WebSocketService.on("role_updated", handleRoleUpdated);

    return () => {
      WebSocketService.off("permissions_updated", handlePermissionsUpdated);
      WebSocketService.off("role_updated", handleRoleUpdated);
    };
  }, []);

  const hasPermission = (permission) => {
    if (!permissions) return false;
    return permissions[permission] === true;
  };

  const canEditMessage = (message) => {
    if (!user || !message) return false;
    return message.sender_id === user.id && hasPermission("can_edit_messages");
  };

  const canDeleteMessage = (message) => {
    if (!user || !message) return false;
    return message.sender_id === user.id && hasPermission("can_delete_messages");
  };

  const canPinMessage = (roomId) => {
    if (!user) return false;
    // Admins can pin in any room
    if (user.role === "admin") return true;
    // Regular users can only pin in main room if they have send permissions
    if (roomId === "00000000-0000-0000-0000-000000000001") {
      return hasPermission("can_send_messages");
    }
    return false;
  };

  const canSendMessage = () => {
    return hasPermission("can_send_messages");
  };

  const canReactToMessage = () => {
    return hasPermission("can_react_to_messages");
  };

  const canSendDM = () => {
    return hasPermission("can_dm_users");
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    canEditMessage,
    canDeleteMessage,
    canPinMessage,
    canSendMessage,
    canReactToMessage,
    canSendDM,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}