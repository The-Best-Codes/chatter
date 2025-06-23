import { create } from 'zustand';
import { apiClient } from '../services/api';
import { Message } from '../types';
import { useAuthStore } from './authStore';
import { encryptMessage, decryptMessage } from '../crypto';

interface MessageState {
  messages: Record<string, Message[]>; // roomId -> messages
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<Message | null>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  clearMessages: (roomId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  isLoading: false,
  error: null,
  
  fetchMessages: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await apiClient.get<Message[]>(`/rooms/${roomId}/messages`);
      
      // Decrypt messages
      const decryptedMessages = await Promise.all(
        messages.map(async (message: Message) => {
          if (message.encrypted) {
            try {
              const privateKey = useAuthStore.getState().privateKey;
              if (!privateKey) throw new Error('Private key not available');
              
              const decrypted = await decryptMessage(
                message.content,
                privateKey
              );
              return { ...message, content: decrypted };
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              return { ...message, content: '[Encrypted message]' };
            }
          }
          return message;
        })
      );
      
      set(state => ({
        messages: { ...state.messages, [roomId]: decryptedMessages },
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch messages', 
        isLoading: false 
      });
    }
  },
  
  sendMessage: async (roomId: string, content: string) => {
    try {
      // Get recipient's public key if it's a direct message
      const room = useAuthStore.getState().rooms.find(r => r.id === roomId);
      
      let encryptedContent = content;
      
      // Encrypt the message if the room has encryption enabled
      if (room?.encrypted) {
        try {
          const publicKey = room.publicKey; // This would be the recipient's public key
          if (!publicKey) throw new Error('Public key not available');
          
          encryptedContent = await encryptMessage(content, publicKey);
        } catch (error) {
          console.error('Failed to encrypt message:', error);
          return null;
        }
      }
      
      // Note: The backend doesn't have a direct endpoint to send messages via REST API
      // This would typically be done through the WebSocket connection
      // For now, we'll use a dummy implementation
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        roomId,
        sender_id: useAuthStore.getState().user?.id || 'unknown',
        content: encryptedContent,
        encrypted: room?.encrypted || false,
        created_at: new Date().toISOString(),
        sender: useAuthStore.getState().user || undefined
      };
      
      // Store the decrypted content in our local state
      const messageWithDecryptedContent = {
        ...newMessage,
        content // Use the original unencrypted content
      };
      
      set(state => {
        const roomMessages = state.messages[roomId] || [];
        return {
          messages: {
            ...state.messages,
            [roomId]: [...roomMessages, messageWithDecryptedContent]
          }
        };
      });
      
      return messageWithDecryptedContent;
    } catch (error) {
      console.error('Failed to send message:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
      return null;
    }
  },
  
  addMessage: (message: Message) => {
    const { roomId } = message;
    
    set(state => {
      const roomMessages = state.messages[roomId] || [];
      return {
        messages: {
          ...state.messages,
          [roomId]: [...roomMessages, message]
        }
      };
    });
  },
  
  updateMessage: async (messageId: string, content: string) => {
    try {
      // Note: The backend doesn't have a direct endpoint to update messages
      // This would typically be done through the WebSocket connection
      // For now, we'll use a dummy implementation
      
      // Find the message in our state
      let roomId: string | null = null;
      
      for (const [rid, messages] of Object.entries(get().messages)) {
        if (messages.some(m => m.id === messageId)) {
          roomId = rid;
          break;
        }
      }
      
      if (!roomId) {
        throw new Error('Message not found');
      }
      
      set(state => {
        const roomMessages = state.messages[roomId!] || [];
        
        const updatedMessages = roomMessages.map(msg => 
          msg.id === messageId ? { ...msg, content } : msg
        );
        
        return {
          messages: {
            ...state.messages,
            [roomId!]: updatedMessages
          }
        };
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update message:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update message'
      });
      return false;
    }
  },
  
  deleteMessage: async (messageId: string) => {
    try {
      // First find the message to get its roomId
      let roomId: string | null = null;
      let messageIndex = -1;
      
      for (const [rid, messages] of Object.entries(get().messages)) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          roomId = rid;
          messageIndex = index;
          break;
        }
      }
      
      if (!roomId || messageIndex === -1) {
        throw new Error('Message not found');
      }
      
      // Note: The backend doesn't have a direct endpoint to delete messages
      // This would typically be done through the WebSocket connection
      // For now, we'll just update our local state
      
      set(state => {
        const roomMessages = [...state.messages[roomId!]];
        roomMessages.splice(messageIndex, 1);
        
        return {
          messages: {
            ...state.messages,
            [roomId!]: roomMessages
          }
        };
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete message'
      });
      return false;
    }
  },
  
  clearMessages: (roomId: string) => {
    set(state => ({
      messages: {
        ...state.messages,
        [roomId]: []
      }
    }));
  }
}));