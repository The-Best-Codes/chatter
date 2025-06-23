import { LogOut, Settings, Shield, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import ApiService from "../../services/api-service";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function UserProfile({ onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (activeTab === "sessions") {
      loadSessions();
    } else if (activeTab === "notifications") {
      loadNotifications();
    }
  }, [activeTab]);

  const loadSessions = async () => {
    try {
      const userSessions = await ApiService.getSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      const userNotifications = await ApiService.getNotifications();
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await ApiService.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await ApiService.clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await ApiService.markNotificationAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: Settings },
    { id: "sessions", label: "Sessions", icon: Smartphone },
    { id: "notifications", label: "Notifications", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-48 border-r border-border p-4">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={logout}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {user?.display_name?.charAt(0) ||
                          user?.username?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {user?.display_name || user?.username}
                      </h3>
                      <p className="text-muted-foreground">@{user?.username}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        defaultValue={user?.display_name || ""}
                        placeholder="Your display name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        defaultValue={user?.username || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <Button>Save Changes</Button>
                  </div>
                </div>
              )}

              {activeTab === "sessions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Active Sessions</h3>
                    <Button variant="outline" size="sm" onClick={loadSessions}>
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border border-border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {session.user_agent || "Unknown Device"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {session.ip_address} • Last active:{" "}
                              {new Date(session.last_activity).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.is_current && (
                            <Badge variant="secondary">Current</Badge>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={session.is_current}
                          >
                            End Session
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearNotifications}
                    >
                      Clear All
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border border-border rounded-md ${
                            !notification.read ? "bg-accent/50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                {notification.title}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {notification.content}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(
                                  notification.created_at,
                                ).toLocaleString()}
                              </div>
                            </div>

                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleMarkNotificationRead(notification.id)
                                }
                              >
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
