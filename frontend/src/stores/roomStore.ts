import { create } from 'zustand';
import { apiClient } from '../services/api';
import { Room } from '../types';

interface RoomState {
  rooms: Room[];
  currentRoomId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRooms: () => Promise<void>;
  createRoom: (name: string, isPrivate: boolean) => Promise<Room | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  setCurrentRoom: (roomId: string | null) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      // Note: The backend doesn't have a direct endpoint to list all rooms
      // We'll need to implement this on the backend or use a different approach
      // For now, we'll use a dummy implementation
      const dummyRooms: Room[] = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          type: "group",
          name: "General",
          created_at: new Date().toISOString()
        }
      ];
      set({ rooms: dummyRooms, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch rooms',
        isLoading: false
      });
    }
  },

  createRoom: async (name: string, isPrivate: boolean) => {
    set({ isLoading: true, error: null });
    try {
      // Note: The backend doesn't have a direct endpoint to create a group room
      // We'll need to implement this on the backend
      // For now, we'll use a dummy implementation
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        type: "group",
        name,
        created_at: new Date().toISOString()
      };

      set(state => ({
        rooms: [...state.rooms, newRoom],
        currentRoomId: newRoom.id,
        isLoading: false
      }));
      return newRoom;
    } catch (error) {
      console.error('Failed to create room:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create room',
        isLoading: false
      });
      return null;
    }
  },

  joinRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Note: The backend doesn't have a direct endpoint to join a room
      // We'll need to implement this on the backend
      // For now, we'll just set the current room
      set({ isLoading: false, currentRoomId: roomId });
      return true;
    } catch (error) {
      console.error('Failed to join room:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to join room',
        isLoading: false
      });
      return false;
    }
  },

  leaveRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Note: The backend doesn't have a direct endpoint to leave a room
      // We'll need to implement this on the backend

      // Update current room if leaving the current room
      if (get().currentRoomId === roomId) {
        set({ currentRoomId: null });
      }

      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to leave room:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to leave room',
        isLoading: false
      });
      return false;
    }
  },

  setCurrentRoom: (roomId: string | null) => {
    set({ currentRoomId: roomId });
  }
}));
