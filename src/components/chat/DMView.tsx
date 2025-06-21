import { useState, useEffect, useCallback } from 'react';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
import type { Message } from '@/lib/api/room-messages';
import type { DirectMessageConversation } from '@/lib/api/direct-messages';
import { useAuth } from '@/components/auth';
import { useWebSocket } from '@/lib/useWebSocket';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DMViewProps {
  dmId: string;
}

export function DMView({ dmId }: DMViewProps) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<DirectMessageConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageTime, setOldestMessageTime] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Handle new messages from WebSocket
  const handleNewMessage = useCallback((message: Message) => {
    if (message.dmId === dmId) {
      setMessages(prev => [...prev, message]);
    }
  }, [dmId]);
  
  // Handle edited messages from WebSocket
  const handleEditedMessage = useCallback((message: Message) => {
    if (message.dmId === dmId) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? message : m
      ));
    }
  }, [dmId]);
  
  // Handle deleted messages from WebSocket
  const handleDeletedMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);
  
  // Handle user typing from WebSocket
  const handleUserTyping = useCallback((userId: string) => {
    if (userId === user?.id) return; // Ignore own typing events
    
    setIsTyping(true);
    
    // Clear typing indicator after 3 seconds
    setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, [user?.id]);
  
  // Initialize WebSocket connection
  const { sendTyping } = useWebSocket({
    dmId,
    onMessage: handleNewMessage,
    onMessageEdited: handleEditedMessage,
    onMessageDeleted: handleDeletedMessage,
    onUserTyping: handleUserTyping,
    onError: (error) => toast.error(`WebSocket error: ${error.message || 'Unknown error'}`)
  });
  
  // Fetch conversation details
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const response = await fetch(`/api/direct-messages/${dmId}`);
        if (response.ok) {
          const data = await response.json();
          setConversation(data);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast.error('Failed to load conversation details');
      }
    };
    
    fetchConversation();
  }, [dmId]);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/direct-messages/${dmId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          
          if (data.length > 0) {
            setOldestMessageTime(data[0].createdAt);
            setHasMore(data.length >= 50); // Assuming 50 is the page size
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, [dmId]);
  
  // Load more messages
  const loadMoreMessages = async () => {
    if (!oldestMessageTime || !hasMore) return;
    
    try {
      const response = await fetch(`/api/direct-messages/${dmId}/messages?before=${oldestMessageTime}`);
      
      if (response.ok) {
        const olderMessages = await response.json();
        
        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setOldestMessageTime(olderMessages[0].createdAt);
          setHasMore(olderMessages.length >= 50);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Failed to load more messages');
    }
  };
  
  // Send a new message
  const handleSendMessage = async (content: string, attachment?: File) => {
    if (!user) return false;
    
    try {
      // Send typing indicator
      sendTyping();
      
      let url = `/api/direct-messages/${dmId}/messages`;
      let body: any = { content };
      
      if (attachment) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('content', content);
        
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message with attachment');
        }
        
        return true;
      } else {
        // Regular text message
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  };
  
  // Edit a message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user) return false;
    
    try {
      const response = await fetch(`/api/direct-messages/${dmId}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
      });
      
      if (!response.ok) {
        throw new Error('Failed to edit message');
      }
      
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
      return false;
    }
  };
  
  // Delete a message
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return false;
    
    try {
      const response = await fetch(`/api/direct-messages/${dmId}/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      return false;
    }
  };
  
  if (!conversation) {
    return <div className="p-4">Loading conversation...</div>;
  }
  
  // Get the other user in the conversation
  const otherUser = user?.id === conversation.user1Id 
    ? { id: conversation.user2Id, username: conversation.user2Username }
    : { id: conversation.user1Id, username: conversation.user1Username };
  
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-3">
        <Avatar>
          <AvatarFallback>
            {otherUser.username?.substring(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{otherUser.username}</h2>
          {isTyping && (
            <p className="text-sm text-muted-foreground">typing...</p>
          )}
        </div>
      </div>
      
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMoreMessages}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
      >
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={sendTyping}
        />
      </ChatArea>
    </div>
  );
}