import React from 'react';
import { useAuthStore } from '../stores/authStore';

export function ChatPage() {
  const { user, rooms, logout } = useAuthStore();
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
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
        
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Rooms</h3>
          <ul className="space-y-1">
            {rooms.map((room) => (
              <li key={room.id}>
                <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
                  {room.name || 'Direct Message'}
                </button>
              </li>
            ))}
          </ul>
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
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-medium">Welcome to Chatter</h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-center text-gray-500">
            <p>Select a room to start chatting</p>
          </div>
        </div>
      </div>
    </div>
  );
}