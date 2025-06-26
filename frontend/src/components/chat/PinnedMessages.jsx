import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ApiService from "../../services/api-service";
import WebSocketService from "../../services/websocket-service";
import { Button } from "../ui/button";
import { MessageList } from "./MessageList";

export function PinnedMessages({
  room,
  onClose,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onToggleReaction,
  onReplyToMessage,
}) {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (room) {
      loadPinnedMessages();

      // Set up WebSocket listeners for real-time updates
      const handleMessagePinned = ({ messageId, roomId, isPinned }) => {
        if (roomId === room.id) {
          if (isPinned) {
            // Reload pinned messages to get the newly pinned message
            loadPinnedMessages();
          } else {
            // Remove the unpinned message from the list
            setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
          }
        }
      };

      const handleMessageDeleted = ({ messageId, roomId }) => {
        if (roomId === room.id) {
          setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      };

      const handleMessageEdited = (message) => {
        if (message.room_id === room.id) {
          setPinnedMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
          );
        }
      };

      const handleReactionChanged = ({ messageId, roomId, reactions }) => {
        if (roomId === room.id) {
          setPinnedMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
          );
        }
      };

      WebSocketService.on("message_pinned", handleMessagePinned);
      WebSocketService.on("message_deleted", handleMessageDeleted);
      WebSocketService.on("message_edited", handleMessageEdited);
      WebSocketService.on("reaction_changed", handleReactionChanged);

      return () => {
        WebSocketService.off("message_pinned", handleMessagePinned);
        WebSocketService.off("message_deleted", handleMessageDeleted);
        WebSocketService.off("message_edited", handleMessageEdited);
        WebSocketService.off("reaction_changed", handleReactionChanged);
      };
    }
  }, [room]);

  const loadPinnedMessages = async () => {
    if (!room) return;

    setLoading(true);
    try {
      const messages = await ApiService.getPinnedMessages(room.id);
      setPinnedMessages(messages);
    } catch (error) {
      console.error("Failed to load pinned messages:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pinned Messages</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">
              Loading pinned messages...
            </div>
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No pinned messages</p>
              <p className="text-sm mt-1">
                Pin important messages to see them here
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <MessageList
              messages={pinnedMessages}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onPinMessage={onPinMessage}
              onToggleReaction={onToggleReaction}
              onReplyToMessage={onReplyToMessage}
              replyingTo={null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
