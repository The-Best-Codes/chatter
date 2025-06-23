import React, { useState, useRef, useEffect } from 'react';
import { websocketService } from '../../services/websocket';

interface MessageInputProps {
  roomId: string;
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ roomId, onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Focus input when roomId changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [roomId]);
  
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      websocketService.sendTypingStatus(roomId, true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      websocketService.sendTypingStatus(roomId, false);
    }, 2000);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    
    try {
      await onSendMessage(message);
      setMessage('');
      
      // Clear typing status
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setIsTyping(false);
      websocketService.sendTypingStatus(roomId, false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex items-end">
        <textarea
          ref={inputRef}
          className="flex-1 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          placeholder={disabled ? "Select a room to start chatting" : "Type a message..."}
          rows={1}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!message.trim() || disabled}
        >
          Send
        </button>
      </div>
    </form>
  );
}