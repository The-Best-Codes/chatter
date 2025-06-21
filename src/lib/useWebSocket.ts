import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth';
import { toast } from 'sonner';
import { decryptMessage } from './encryption-simplified';
import type { WebSocketMessage } from './websocket';
import { WebSocketMessageType } from './websocket';

interface UseWebSocketOptions {
  roomId?: string;
  dmId?: string;
  onMessage?: (message: any) => void;
  onMessageEdited?: (message: any) => void;
  onMessageDeleted?: (messageId: string) => void;
  onUserTyping?: (userId: string) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onError?: (error: any) => void;
}

export function useWebSocket({
  roomId,
  dmId,
  onMessage,
  onMessageEdited,
  onMessageDeleted,
  onUserTyping,
  onUserJoined,
  onUserLeft,
  onError
}: UseWebSocketOptions) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user || !user.id || wsRef.current || isConnecting) return;

    setIsConnecting(true);
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}?userId=${user.id}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        
        // Join room or DM if provided
        if (roomId) {
          sendMessage({
            type: WebSocketMessageType.USER_JOINED,
            payload: { userId: user.id },
            roomId,
            userId: user.id
          });
        }
        
        if (dmId) {
          // For DMs, we just need to track which DM conversations the user is viewing
          wsRef.current?.send(JSON.stringify({
            type: 'JOIN_DM',
            dmId,
            userId: user.id
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case WebSocketMessageType.ROOM_MESSAGE:
            case WebSocketMessageType.DM_MESSAGE:
              if (onMessage && message.payload) {
                // If the message is encrypted, decrypt it
                if (message.payload.encryptedContent) {
                  message.payload.content = decryptMessage(message.payload.encryptedContent);
                }
                onMessage(message.payload);
              }
              break;
              
            case WebSocketMessageType.MESSAGE_EDITED:
              if (onMessageEdited && message.payload) {
                // If the message is encrypted, decrypt it
                if (message.payload.encryptedContent) {
                  message.payload.content = decryptMessage(message.payload.encryptedContent);
                }
                onMessageEdited(message.payload);
              }
              break;
              
            case WebSocketMessageType.MESSAGE_DELETED:
              if (onMessageDeleted && message.payload?.messageId) {
                onMessageDeleted(message.payload.messageId);
              }
              break;
              
            case WebSocketMessageType.USER_TYPING:
              if (onUserTyping && message.userId) {
                onUserTyping(message.userId);
              }
              break;
              
            case WebSocketMessageType.USER_JOINED:
              if (onUserJoined && message.userId) {
                onUserJoined(message.userId);
              }
              break;
              
            case WebSocketMessageType.USER_LEFT:
              if (onUserLeft && message.userId) {
                onUserLeft(message.userId);
              }
              break;
              
            case WebSocketMessageType.ERROR:
              if (onError) {
                onError(message.payload);
              } else {
                toast.error(message.payload?.message || 'WebSocket error');
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError(new Error('Failed to parse WebSocket message'));
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);
        if (onError) onError(event);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000) as unknown as number;
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setError(error instanceof Error ? error : new Error('Failed to connect to WebSocket'));
      setIsConnecting(false);
    }
  }, [user, roomId, dmId, isConnecting, onMessage, onMessageEdited, onMessageDeleted, onUserTyping, onUserJoined, onUserLeft, onError]);

  // Send a message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }
    
    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback(() => {
    if (!user?.id) return;
    
    if (roomId) {
      sendMessage({
        type: WebSocketMessageType.USER_TYPING,
        payload: { timestamp: Date.now() },
        roomId,
        userId: user.id
      });
    } else if (dmId) {
      sendMessage({
        type: WebSocketMessageType.USER_TYPING,
        payload: { timestamp: Date.now() },
        dmId,
        userId: user.id
      });
    }
  }, [user, roomId, dmId, sendMessage]);

  // Connect on component mount and disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      // Leave room or DM if provided
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (roomId && user?.id) {
          sendMessage({
            type: WebSocketMessageType.USER_LEFT,
            payload: { userId: user.id },
            roomId,
            userId: user.id
          });
        }
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect, roomId, user, sendMessage]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    sendTyping
  };
}