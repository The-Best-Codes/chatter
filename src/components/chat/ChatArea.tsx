import { useEffect, useRef, useState } from 'react';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import type { Message } from '@/lib/api/room-messages';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSendMessage: (content: string, attachment?: File) => Promise<boolean>;
  onEditMessage: (messageId: string, newContent: string) => Promise<boolean>;
  onDeleteMessage: (messageId: string) => Promise<boolean>;
  maxMessageLength?: number;
  canSendAttachments?: boolean;
  typingIndicator?: React.ReactNode;
  children?: React.ReactNode;
}

export function ChatArea({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  maxMessageLength,
  canSendAttachments,
  typingIndicator,
  children
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);
  
  // Handle scroll events to determine if we should auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setAutoScroll(isNearBottom);
      setShowScrollButton(!isNearBottom);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll to bottom on demand
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="p-4 text-center">
            <Button 
              variant="outline" 
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load older messages'}
            </Button>
          </div>
        )}
        
        {/* Messages */}
        <div className="py-4">
          {messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
            />
          ))}
          {typingIndicator}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          className="absolute bottom-24 right-6 rounded-full shadow-lg"
          size="icon"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
      
      {/* Message input */}
      {children || (
        <MessageInput
          onSendMessage={onSendMessage}
          maxLength={maxMessageLength}
          canSendAttachments={canSendAttachments}
        />
      )}
    </div>
  );
}