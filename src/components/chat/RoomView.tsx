import { useState, useEffect } from 'react';
import { ChatArea } from './ChatArea';
import { Message } from '@/lib/api/room-messages';
import { Room } from '@/lib/api/rooms';
import { useAuth } from '@/components/auth';

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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time updates (this would be replaced with WebSockets in a real implementation)
    const intervalId = setInterval(() => {
      fetchNewMessages();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [roomId]);
  
  // Fetch new messages
  const fetchNewMessages = async () => {
    if (messages.length === 0) return;
    
    const latestMessageTime = messages[messages.length - 1].createdAt;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages?after=${latestMessageTime}`);
      if (response.ok) {
        const newMessages = await response.json();
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
        }
      }
    } catch (error) {
      console.error('Error fetching new messages:', error);
    }
  };
  
  // Load more (older) messages
  const handleLoadMore = async () => {
    if (!oldestMessageTime) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages?before=${oldestMessageTime}`);
      if (response.ok) {
        const olderMessages = await response.json();
        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setOldestMessageTime(olderMessages[0].createdAt);
          setHasMore(olderMessages.length >= 50); // Assuming 50 is the page size
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send a message
  const handleSendMessage = async (content: string, attachment?: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      if (attachment) {
        formData.append('attachment', attachment);
      }
      
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };
  
  // Edit a message
  const handleEditMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });
      
      if (response.ok) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, content: newContent, updatedAt: Date.now() } : msg
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  };
  
  // Delete a message
  const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      {room && (
        <div className="p-4 border-b flex items-center">
          <div>
            <h2 className="text-xl font-semibold">{room.name}</h2>
            {room.description && (
              <p className="text-sm text-muted-foreground">{room.description}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          maxMessageLength={user?.permissions?.maxMessageLength}
          canSendAttachments={user?.permissions?.canSendAttachments}
        />
      </div>
    </div>
  );
}