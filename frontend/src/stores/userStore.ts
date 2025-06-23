import { create } from 'zustand';
import { apiClient } from '../services/api';
import { User } from '../types';

interface UserState {
  users: User[];
  onlineUsers: Set<string>; // Set of user IDs
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchUsers: () => Promise<void>;
  getUserById: (userId: string) => User | undefined;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  searchUsers: (query: string) => Promise<User[]>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  onlineUsers: new Set<string>(),
  isLoading: false,
  error: null,
  
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      // Note: The backend doesn't have a direct endpoint to list all users without a search term
      // We'll use a dummy implementation for now
      const dummyUsers: User[] = [
        {
          id: "user1",
          username: "johndoe",
          display_name: "John Doe",
          created_at: new Date().toISOString()
        }
      ];
      set({ users: dummyUsers, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch users', 
        isLoading: false 
      });
    }
  },
  
  getUserById: (userId: string) => {
    return get().users.find(user => user.id === userId);
  },
  
  setUserOnline: (userId: string, isOnline: boolean) => {
    set(state => {
      const newOnlineUsers = new Set(state.onlineUsers);
      
      if (isOnline) {
        newOnlineUsers.add(userId);
      } else {
        newOnlineUsers.delete(userId);
      }
      
      return { onlineUsers: newOnlineUsers };
    });
  },
  
  searchUsers: async (query: string) => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    set({ isLoading: true, error: null });
    try {
      const users = await apiClient.get<User[]>(`/users?search=${encodeURIComponent(query)}`);
      set({ isLoading: false });
      return users;
    } catch (error) {
      console.error('Failed to search users:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search users', 
        isLoading: false 
      });
      return [];
    }
  }
}));