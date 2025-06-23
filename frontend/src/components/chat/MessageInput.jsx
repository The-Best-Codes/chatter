import { Paperclip, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export function MessageInput({ onSendMessage, onStartTyping, onStopTyping }) {
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
    <div className="p-4 border-t border-border bg-card">
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="mb-2">
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-32 resize-none pr-12"
            rows={1}
          />

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 bottom-2 h-6 w-6"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="mb-2"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
