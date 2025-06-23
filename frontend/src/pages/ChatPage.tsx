import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useMessageStore } from '../stores/messageStore';
import { useUserStore } from '../stores/userStore';
import { websocketService } from '../services/websocket';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { UserPanel } from '../components/chat/UserPanel';
import { CreateRoomModal } from '../components/chat/CreateRoomModal';
import { Room, Message } from '../types';
import toast from 'react-hot-toast';

export function ChatPage() {
  const { user } = useAuthStore();
  const { rooms, currentRoomId, fetchRooms, setCurrentRoom } = useRoomStore();
  const { messages, isLoading, fetchMessages, sendMessage, addMessage } = useMessageStore();
  const { fetchUsers, setUserOnline } = useUserStore();
  
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  // Get current room
  const currentRoom = rooms.find(room => room.id === currentRoomId) || null;
  
  // Get messages for current room
  const currentMessages = currentRoomId ? messages[currentRoomId] || [] : [];
  
  // Setup WebSocket event handlers
  useEffect(() => {
    // Handle new message
    const handleNewMessage = async (message: Message) => {
      // Only add message if it's for the current room or if we're not in a room yet
      if (message.roomId === currentRoomId || !currentRoomId) {
        addMessage(message);
      } else {
        // Show notification for messages in other rooms
        const sender = message.sender?.display_name || 'Someone';
        const roomName = rooms.find(r => r.id === message.roomId)?.name || 'a room';
        toast(`${sender} sent a message in ${roomName}`);
      }
    };
    
    // Handle user online status
    const handleUserStatus = (data: { userId: string; status: 'online' | 'offline' }) => {
      setUserOnline(data.userId, data.status === 'online');
      
      // Show toast notification
      const username = data.userId === user?.id 
        ? 'You are' 
        : `${data.userId} is`;
        
      toast(`${username} now ${data.status}`);
    };
    
    // Handle typing status
    const handleTypingStatus = (data: { roomId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const roomTypers = prev[data.roomId] || [];
        
        if (data.isTyping && !roomTypers.includes(data.userId)) {
          return {
            ...prev,
            [data.roomId]: [...roomTypers, data.userId]
          };
        } else if (!data.isTyping && roomTypers.includes(data.userId)) {
          return {
            ...prev,
            [data.roomId]: roomTypers.filter(id => id !== data.userId)
          };
        }
        
        return prev;
      });
    };
    
    websocketService.on('message', handleNewMessage);
    websocketService.on('user_status', handleUserStatus);
    websocketService.on('typing', handleTypingStatus);
    
    return () => {
      websocketService.off('message', handleNewMessage);
      websocketService.off('user_status', handleUserStatus);
      websocketService.off('typing', handleTypingStatus);
    };
  }, [addMessage, currentRoomId, rooms, setUserOnline, user?.id]);
  
  // Fetch initial data
  useEffect(() => {
    fetchRooms();
    fetchUsers();
  }, [fetchRooms, fetchUsers]);
  
  // Fetch messages when room changes
  useEffect(() => {
    if (currentRoomId) {
      fetchMessages(currentRoomId);
    }
  }, [currentRoomId, fetchMessages]);
  
  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!currentRoomId) return;
    
    try {
      await sendMessage(currentRoomId, content);
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    }
  };
  
  // Get typing indicator text
  const getTypingIndicator = () => {
    if (!currentRoomId || !typingUsers[currentRoomId] || typingUsers[currentRoomId].length === 0) {
      return null;
    }
    
    const typers = typingUsers[currentRoomId].filter(id => id !== user?.id);
    
    if (typers.length === 0) return null;
    
    if (typers.length === 1) {
      return <div className="text-xs text-gray-500 italic">Someone is typing...</div>;
    }
    
    return <div className="text-xs text-gray-500 italic">Several people are typing...</div>;
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <ChatSidebar onCreateRoom={() => setShowCreateRoomModal(true)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatHeader 
          room={currentRoom} 
          onToggleUserPanel={() => setShowUserPanel(!showUserPanel)} 
        />
        
        <MessageList 
          messages={currentMessages} 
          isLoading={isLoading} 
        />
        
        {getTypingIndicator()}
        
        <MessageInput 
          roomId={currentRoomId || ''} 
          onSendMessage={handleSendMessage} 
          disabled={!currentRoomId} 
        />
      </div>
      
      {/* User Panel */}
      <UserPanel 
        room={currentRoom} 
        visible={showUserPanel} 
      />
      
      {/* Create Room Modal */}
      <CreateRoomModal 
        isOpen={showCreateRoomModal} 
        onClose={() => setShowCreateRoomModal(false)} 
      />
    </div>
  );
}