import React, { useEffect, useRef } from 'react';
import { Message, User } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (isLoading) {
    return (
      <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      </div>
    );
  }
  
  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {};
  messages.forEach(message => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });
  
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="mx-4 text-sm text-gray-500">{date}</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          
          {dateMessages.map((message, index) => {
            const isCurrentUser = message.sender_id === user?.id;
            const showAvatar = index === 0 || dateMessages[index - 1].sender_id !== message.sender_id;
            
            return (
              <div 
                key={message.id} 
                className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isCurrentUser && showAvatar && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                      {message.sender?.display_name.charAt(0) || '?'}
                    </div>
                  </div>
                )}
                
                <div className={`max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                  {showAvatar && (
                    <div className="flex items-center mb-1">
                      <span className="font-medium text-sm">
                        {isCurrentUser ? 'You' : message.sender?.display_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  
                  <div 
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentUser 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}