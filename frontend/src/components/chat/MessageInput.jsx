import { Reply, Send, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export function MessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
}) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSendMessage = () => {
    if (message.trim()) {
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
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    // Handle typing indicators
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      onStartTyping();
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
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

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-border bg-card">
      <div className={cn("p-4", replyingTo && "pt-2")}>
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

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-10 max-h-32 resize-none pr-12"
              rows={1}
            />

            {/* TODO: Emoji picker */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-2 h-6 w-6"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
