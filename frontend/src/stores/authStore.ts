import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Room, ApiError } from '../types';
import { authApi } from '../services/api';
import { generateKeyBundle, storeKeys } from '../crypto';
import { websocketService } from '../services/websocket';

interface AuthState {
  user: User | null;
  token: string | null;
  rooms: Room[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      rooms: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(username, password);
          
          // Store the token and user data
          set({ 
            token: response.token,
            user: response.user,
            rooms: response.rooms || [],
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Connect to WebSocket
          websocketService.connect(response.token);
          
        } catch (error) {
          const apiError = error as ApiError;
          set({ 
            error: apiError.message || 'Failed to login', 
            isLoading: false,
            isAuthenticated: false,
          });
        }
      },
      
      signup: async (username: string, displayName: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Generate key bundle for E2EE
          const { identityKeyPair, signedPreKeyPair, oneTimeKeyPairs, publicKeyBundle } = 
            await generateKeyBundle();
          
          // Store keys securely
          storeKeys(identityKeyPair, signedPreKeyPair, oneTimeKeyPairs);
          
          // Register with the server
          const response = await authApi.signup(
            username,
            displayName,
            password,
            JSON.stringify(identityKeyPair.publicKey),
            publicKeyBundle
          );
          
          // Store the token and user data
          set({ 
            token: response.token,
            user: response.user,
            rooms: response.rooms || [],
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Connect to WebSocket
          websocketService.connect(response.token);
          
        } catch (error) {
          const apiError = error as ApiError;
          set({ 
            error: apiError.message || 'Failed to sign up', 
            isLoading: false,
            isAuthenticated: false,
          });
        }
      },
      
      logout: () => {
        // Disconnect WebSocket
        websocketService.disconnect();
        
        // Clear auth state
        set({ 
          user: null,
          token: null,
          rooms: [],
          isAuthenticated: false,
          error: null,
        });
      },
      
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'chatter-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        rooms: state.rooms,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);