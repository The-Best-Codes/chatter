import React, { useState } from 'react';
import { Room, User } from '../../types';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';

interface UserPanelProps {
  room: Room | null;
  visible: boolean;
}

export function UserPanel({ room, visible }: UserPanelProps) {
  const { onlineUsers } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!visible || !room) {
    return null;
  }
  
  const participants = room.participants || [];
  
  const filteredParticipants = participants.filter(user => 
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">Room Info</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-md font-medium mb-2">About</h3>
        <p className="text-sm text-gray-600">
          {room.type === 'group' ? `# ${room.name || 'Unnamed Room'}` : 'Direct Message'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Created {new Date(room.created_at || '').toLocaleDateString()}
        </p>
        {room.encrypted && (
          <div className="mt-2 flex items-center text-xs text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            End-to-end encrypted
          </div>
        )}
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-md font-medium mb-2">Members ({participants.length})</h3>
        <input
          type="text"
          placeholder="Search members..."
          className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md mb-2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {filteredParticipants.map((participant) => {
            const isOnline = onlineUsers.has(participant.id);
            const isCurrentUser = participant.id === currentUser?.id;
            
            return (
              <li key={participant.id} className="flex items-center">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                    {participant.display_name.charAt(0)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    {participant.display_name}
                    {isCurrentUser && <span className="ml-1 text-xs text-gray-500">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">@{participant.username}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}