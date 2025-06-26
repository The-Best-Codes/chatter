import { Reply, Send, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { usePermissions } from "../../contexts/PermissionContext";
import { EmojiPicker } from "../EmojiPicker";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";

export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
  typingUsers,
}) {
  const { canSendMessage } = usePermissions();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const cursorPositionRef = useRef(null);

  const updateMessageAndTyping = (newMessage, newCursorPos = null) => {
    setMessage(newMessage);
    if (newCursorPos !== null) {
      cursorPositionRef.current = newCursorPos;
    }

    // Handle typing indicators
    if (!isTyping && newMessage.trim()) {
      setIsTyping(true);
      onStartTyping();
    } else if (isTyping && !newMessage.trim()) {
      // If message becomes empty and user was typing, stop typing immediately
      handleStopTyping();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new typing timeout only if there's actual text
    if (newMessage.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 1000);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && canSendMessage()) {
      onSendMessage(message.trim());
      setMessage("");
      handleStopTyping();

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    updateMessageAndTyping(e.target.value);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      onStopTyping();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEmojiSelect = (_messageId, emojiItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const emoji = emojiItem.emoji;
    const start = textarea.selectionStart;
    const currentMessage = message;

    const newMessage =
      currentMessage.substring(0, start) +
      emoji +
      currentMessage.substring(start);

    const newCursorPos = start + emoji.length;

    updateMessageAndTyping(newMessage, newCursorPos);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current && cursorPositionRef.current !== null) {
      const newPos = cursorPositionRef.current;
      textareaRef.current.setSelectionRange(newPos, newPos);
      cursorPositionRef.current = null;
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="flex items-center border-t border-border bg-background min-h-20">
      <div
        className={cn(
          "w-full p-4",
          (replyingTo || typingUsers.length > 0) && "pt-2",
        )}
      >
        {replyingTo && (
          // TODO: Scroll to reply if clicked?
          <Badge
            variant="outline"
            className="text-xs mb-2 bg-blue-100 dark:bg-blue-900"
          >
            <Reply className="h-4 w-4" />
            <span className="max-w-60 overflow-hidden truncate select-none">
              {replyingTo.encrypted_content}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4"
              onClick={() => onCancelReply()}
            >
              <X />
            </Button>
          </Badge>
        )}

        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            {/* TODO: Hide if too many users, also add and to last user if multiple. Probably just move to a new function / component */}
            {typingUsers.map((u) => u.displayName || u.username).join(", ")}
            {typingUsers.length === 1 ? " is" : " are"} typing...
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={canSendMessage() ? "Type a message..." : "You don't have permission to send messages"}
              className="min-h-10 max-h-32 resize-none pr-10 wrap-anywhere"
              rows={1}
              disabled={!canSendMessage()}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 bottom-2 h-6 w-6"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EmojiPicker
                  messageId={"no-id-message-textarea"}
                  onEmojiSelect={handleEmojiSelect}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            className="h-10 w-10"
            onClick={handleSendMessage}
            disabled={!message.trim() || !canSendMessage()}
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}
