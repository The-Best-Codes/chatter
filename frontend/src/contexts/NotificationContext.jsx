import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import ApiService from "../services/api-service";
import WebSocketService from "../services/websocket-service";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || !token) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      try {
        const response = await ApiService.getNotifications();
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user, token]);

  // Listen for real-time notification updates
  useEffect(() => {
    const handleNewNotification = (payload) => {
      setNotifications(prev => [payload.notification, ...prev]);
      setUnreadCount(payload.unreadCount);
      
      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        const notif = payload.notification;
        new Notification(`New ${notif.type} from ${notif.source_display_name || notif.source_username}`, {
          body: notif.type === 'mention' ? 'You were mentioned in a message' : 'Someone replied to your message',
          icon: '/favicon.ico'
        });
      }
    };

    const handleNotificationsUpdated = (payload) => {
      setUnreadCount(payload.unreadCount);
      
      // Remove cleared notifications from the list
      if (payload.clearedIds && payload.clearedIds.length > 0) {
        setNotifications(prev => 
          prev.filter(notif => !payload.clearedIds.includes(notif.id))
        );
      }
    };

    WebSocketService.on("new_notification", handleNewNotification);
    WebSocketService.on("notifications_updated", handleNotificationsUpdated);

    return () => {
      WebSocketService.off("new_notification", handleNewNotification);
      WebSocketService.off("notifications_updated", handleNotificationsUpdated);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await ApiService.markNotificationAsRead(notificationId);
      // The websocket will handle updating the state
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const clearNotifications = async (notificationIds) => {
    try {
      await ApiService.clearNotifications(notificationIds);
      // The websocket will handle updating the state
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const getNotificationsByMessage = (messageId) => {
    return notifications.filter(notif => notif.source_message_id === messageId);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    clearNotifications,
    getNotificationsByMessage,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}