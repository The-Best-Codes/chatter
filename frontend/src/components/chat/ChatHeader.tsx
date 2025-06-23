import React from 'react';
import { Room, User } from '../../types';
import { useUserStore } from '../../stores/userStore';

interface ChatHeaderProps {
  room: Room | null;
  onToggleUserPanel: () => void;
}

export function ChatHeader({ room, onToggleUserPanel }: ChatHeaderProps) {
  const { onlineUsers } = useUserStore();
  
  if (!room) {
    return (
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-medium">Welcome to Chatter</h2>
      </div>
    );
  }
  
  const getRoomName = () => {
    if (room.name) return room.name;
    
    // For DMs, show the other participant's name
    if (room.type === 'dm' && room.participants && room.participants.length > 0) {
      const otherUser = room.participants[0]; // Assuming the first participant is the other user
      return otherUser.display_name;
    }
    
    return 'Unnamed Room';
  };
  
  const getOnlineStatus = () => {
    if (room.type !== 'dm' || !room.participants || room.participants.length === 0) {
      return null;
    }
    
    const otherUser = room.participants[0];
    const isOnline = onlineUsers.has(otherUser.id);
    
    return (
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></div>
        <span className="text-sm text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    );
  };
  
  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-medium">
          {room.type === 'group' ? `# ${getRoomName()}` : getRoomName()}
        </h2>
        {getOnlineStatus()}
      </div>
      
      <button
        onClick={onToggleUserPanel}
        className="p-2 rounded-md hover:bg-gray-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}