import { Hash, MoreVertical, Pin, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ApiService from "../../services/api-service";
import WebSocketService from "../../services/websocket-service";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

export function ChatArea({ room }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (room) {
      loadMessages();

      // Set up WebSocket message handlers
      const handleNewMessage = (message) => {
        if (message.room_id === room.id) {
          setMessages((prev) => [...prev, message]);
          scrollToBottom();
        }
      };

      const handleMessageEdited = (message) => {
        if (message.room_id === room.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
          );
        }
      };

      const handleMessageDeleted = ({ messageId, roomId }) => {
        if (roomId === room.id) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      };

      const handleUserTyping = ({ roomId, userId, username, displayName }) => {
        if (roomId === room.id) {
          setTypingUsers((prev) => {
            const existing = prev.find((u) => u.userId === userId);
            if (!existing) {
              return [...prev, { userId, username, displayName }];
            }
            return prev;
          });
        }
      };

      const handleUserStoppedTyping = ({ roomId, userId }) => {
        if (roomId === room.id) {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      };

      WebSocketService.on("new_message", handleNewMessage);
      WebSocketService.on("message_edited", handleMessageEdited);
      WebSocketService.on("message_deleted", handleMessageDeleted);
      WebSocketService.on("user_typing", handleUserTyping);
      WebSocketService.on("user_stopped_typing", handleUserStoppedTyping);

      return () => {
        WebSocketService.off("new_message", handleNewMessage);
        WebSocketService.off("message_edited", handleMessageEdited);
        WebSocketService.off("message_deleted", handleMessageDeleted);
        WebSocketService.off("user_typing", handleUserTyping);
        WebSocketService.off("user_stopped_typing", handleUserStoppedTyping);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const loadMessages = async () => {
    if (!room) return;

    setLoading(true);
    try {
      const roomMessages = await ApiService.getRoomMessages(room.id);
      setMessages(roomMessages);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = (content, replyToMessageId = null) => {
    // For now, we'll send the content as-is (not encrypted)
    // Later, we will encrypt the content here
    WebSocketService.sendMessage(room.id, content, replyToMessageId);
  };

  const handleEditMessage = (messageId, newContent) => {
    WebSocketService.editMessage(messageId, newContent);
  };

  const handleDeleteMessage = (messageId) => {
    WebSocketService.deleteMessage(messageId);
  };

  const handlePinMessage = async (messageId) => {
    try {
      await ApiService.pinMessage(room.id, messageId);
      // Refresh messages to show updated pin status
      loadMessages();
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  };

  if (!room) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {room.type === "dm" ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={room.other_user?.avatar_url} />
                <AvatarFallback>
                  {room.other_user?.display_name?.charAt(0) ||
                    room.other_user?.username?.charAt(0) ||
                    "?"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                <Hash className="h-4 w-4" />
              </div>
            )}

            <div>
              <h2 className="font-semibold">
                {room.type === "dm"
                  ? room.other_user?.display_name || room.other_user?.username
                  : room.name}
              </h2>
            </div>
          </div>

          {/* TODO: Implement */}
          <div className="flex items-center gap-2">
            {room.type !== "dm" && (
              <Button variant="ghost" size="icon">
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Pin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading messages...</div>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
            />

            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {/* TODO: Hide if too many users, also add and to last user if multiple */}
                {typingUsers.map((u) => u.displayName || u.username).join(", ")}
                {typingUsers.length === 1 ? " is" : " are"} typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onStartTyping={() => WebSocketService.startTyping(room.id)}
        onStopTyping={() => WebSocketService.stopTyping(room.id)}
      />
    </div>
  );
}
