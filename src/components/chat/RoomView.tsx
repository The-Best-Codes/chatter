import { useState, useEffect, useCallback } from 'react';
import { ChatArea } from './ChatArea';
import type { Message } from '@/lib/api/room-messages';
import type { Room } from '@/lib/api/rooms';
import { useAuth } from '@/components/auth';
import { useWebSocket } from '@/lib/useWebSocket';
import { toast } from 'sonner';

interface RoomViewProps {
  roomId: string;
}

export function RoomView({ roomId }: RoomViewProps) {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageTime, setOldestMessageTime] = useState<number | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // Handle new messages from WebSocket
  const handleNewMessage = useCallback((message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
    }
  }, [roomId]);
  
  // Handle edited messages from WebSocket
  const handleEditedMessage = useCallback((message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? message : m
      ));
    }
  }, [roomId]);
  
  // Handle deleted messages from WebSocket
  const handleDeletedMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);
  
  // Handle user typing from WebSocket
  const handleUserTyping = useCallback((userId: string) => {
    if (userId === user?.id) return; // Ignore own typing events
    
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(current => {
          const updatedSet = new Set(current);
          updatedSet.delete(userId);
          return updatedSet;
        });
      }, 3000);
      
      return newSet;
    });
  }, [user?.id]);
  
  // Initialize WebSocket connection
  const { sendTyping } = useWebSocket({
    roomId,
    onMessage: handleNewMessage,
    onMessageEdited: handleEditedMessage,
    onMessageDeleted: handleDeletedMessage,
    onUserTyping: handleUserTyping,
    onError: (error) => toast.error(`WebSocket error: ${error.message || 'Unknown error'}`)
  });
  
  // Fetch room details
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoom(data);
        }
      } catch (error) {
        console.error('Error fetching room:', error);
        toast.error('Failed to load room details');
      }
    };
    
    fetchRoom();
  }, [roomId]);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/rooms/${roomId}/messages`);
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
  }, [roomId]);
  
  // Load more messages
  const loadMoreMessages = async () => {
    if (!oldestMessageTime || !hasMore) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages?before=${oldestMessageTime}`);
      
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
      
      let url = `/api/rooms/${roomId}/messages`;
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
      const response = await fetch(`/api/rooms/${roomId}/messages/${messageId}`, {
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
      const response = await fetch(`/api/rooms/${roomId}/messages/${messageId}`, {
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
  
  if (!room) {
    return <div className="p-4">Loading room...</div>;
  }
  
  // Get typing users display
  const typingUsersText = () => {
    if (typingUsers.size === 0) return null;
    
    const typingUsersList = Array.from(typingUsers);
    if (typingUsersList.length === 1) {
      return <div className="text-sm text-muted-foreground italic px-4 py-1">Someone is typing...</div>;
    } else {
      return <div className="text-sm text-muted-foreground italic px-4 py-1">Several people are typing...</div>;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-xl font-bold">{room.name}</h2>
        <p className="text-sm text-muted-foreground">{room.description || 'No description'}</p>
      </div>
      
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMoreMessages}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        typingIndicator={typingUsersText()}
      >
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={sendTyping}
        />
      </ChatArea>
    </div>
  );
}