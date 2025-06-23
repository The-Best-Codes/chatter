import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { Room } from '../../types';

interface ChatSidebarProps {
  onCreateRoom: () => void;
}

export function ChatSidebar({ onCreateRoom }: ChatSidebarProps) {
  const { user, logout } = useAuthStore();
  const { rooms, currentRoomId, setCurrentRoom } = useRoomStore();
  const [filter, setFilter] = useState('');
  
  // Filter rooms by name
  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(filter.toLowerCase()) || 
    (!room.name && room.type === 'dm')
  );
  
  // Group rooms by type
  const groupRooms = filteredRooms.filter(room => room.type === 'group');
  const dmRooms = filteredRooms.filter(room => room.type === 'dm');
  
  const handleRoomClick = (roomId: string) => {
    setCurrentRoom(roomId);
  };
  
  const getRoomName = (room: Room) => {
    if (room.name) return room.name;
    
    // For DMs, show the other participant's name
    if (room.type === 'dm' && room.participants && room.participants.length > 0) {
      const otherUser = room.participants.find(p => p.id !== user?.id);
      return otherUser ? otherUser.display_name : 'Unknown User';
    }
    
    return 'Unnamed Room';
  };
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold">Chatter</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
            {user?.display_name.charAt(0)}
          </div>
          <div className="ml-3">
            <p className="font-medium">{user?.display_name}</p>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search rooms..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {groupRooms.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Rooms</h3>
            <ul className="space-y-1 mb-4">
              {groupRooms.map((room) => (
                <li key={room.id}>
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      currentRoomId === room.id 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleRoomClick(room.id)}
                  >
                    # {getRoomName(room)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        
        {dmRooms.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Direct Messages</h3>
            <ul className="space-y-1">
              {dmRooms.map((room) => (
                <li key={room.id}>
                  <button 
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                      currentRoomId === room.id 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleRoomClick(room.id)}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    {getRoomName(room)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        
        <div className="mt-4">
          <button
            onClick={onCreateRoom}
            className="w-full px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            + New Room
          </button>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}