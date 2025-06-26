import { Bell, Check, X } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Timestamp } from "./Timestamp";

export function NotificationCenter({ onNavigateToMessage }) {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleClearAll = async () => {
    if (notifications.length > 0) {
      const notificationIds = notifications.map(n => n.id);
      await clearNotifications(notificationIds);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.source_message_id && onNavigateToMessage) {
      onNavigateToMessage(notification.source_message_id, notification.room_id);
      setIsOpen(false);
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'mention':
        return `${notification.source_display_name || notification.source_username} mentioned you`;
      case 'reply':
        return `${notification.source_display_name || notification.source_username} replied to your message`;
      default:
        return 'New notification';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-6"
                >
                  Clear all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {getNotificationText(notification)}
                        </span>
                        {notification.type === 'mention' && (
                          <Badge variant="secondary" className="text-xs">
                            Mention
                          </Badge>
                        )}
                        {notification.type === 'reply' && (
                          <Badge variant="outline" className="text-xs">
                            Reply
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        in {notification.room_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Timestamp date={notification.created_at} />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}