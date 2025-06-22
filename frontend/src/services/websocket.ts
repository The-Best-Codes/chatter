import { Message } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || '/ws';

type WebSocketEventMap = {
  connected: void;
  disconnected: void;
  authenticated: { message: string };
  error: { message: string };
  new_message: Message;
  message_edited: Message;
  message_deleted: { messageId: string; roomId: string };
  user_typing: { roomId: string; userId: string; username: string; displayName: string };
  user_stopped_typing: { roomId: string; userId: string };
};

type WebSocketEventHandler<K extends keyof WebSocketEventMap> =
  (payload: WebSocketEventMap[K]) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private eventHandlers: {
    [K in keyof WebSocketEventMap]?: Array<WebSocketEventHandler<K>>;
  } = {};
  private token: string | null = null;

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Initialize empty arrays for all event types
    const eventTypes: Array<keyof WebSocketEventMap> = [
      'connected', 'disconnected', 'authenticated', 'error',
      'new_message', 'message_edited', 'message_deleted',
      'user_typing', 'user_stopped_typing'
    ];

    eventTypes.forEach(type => {
      this.eventHandlers[type] = [];
    });
  }

  public connect(token: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.socket = new WebSocket(WS_URL);

    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;

      // Authenticate immediately after connection
      this.sendMessage('auth', { token });

      // Notify listeners
      this.notifyListeners('connected', undefined);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { event: eventType, payload } = data;

        console.log(`WebSocket event received: ${eventType}`, payload);

        // Notify all listeners for this event type
        this.notifyListeners(eventType as keyof WebSocketEventMap, payload);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      this.notifyListeners('disconnected', undefined);

      // Attempt to reconnect if not closed cleanly
      if (event.code !== 1000 && event.code !== 1001) {
        this.attemptReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // The socket will also close after an error
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'User initiated disconnect');
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.token = null;
  }

  public sendMessage(event: string, payload: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, payload }));
    } else {
      console.error('Cannot send message, WebSocket is not connected');
      this.notifyListeners('error', { message: 'WebSocket is not connected' });
    }
  }

  public on<K extends keyof WebSocketEventMap>(
    event: K,
    handler: WebSocketEventHandler<K>
  ): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }

    // Add the handler to the array
    (this.eventHandlers[event] as Array<WebSocketEventHandler<K>>).push(handler);

    // Return a function to unsubscribe
    return () => {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event] = (this.eventHandlers[event] as Array<WebSocketEventHandler<K>>).filter(h => h !== handler);
      }
    };
  }

  private notifyListeners<K extends keyof WebSocketEventMap>(
    event: K,
    payload: WebSocketEventMap[K]
  ): void {
    const handlers = this.eventHandlers[event] as Array<WebSocketEventHandler<K>> | undefined;
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  // Helper methods for common actions
  public sendChatMessage(
    roomId: string,
    encryptedContent: string,
    replyToMessageId?: string,
    mentionedUserIds?: string[]
  ): void {
    this.sendMessage('send_message', {
      roomId,
      encryptedContent,
      replyToMessageId,
      mentionedUserIds
    });
  }

  public editMessage(messageId: string, newEncryptedContent: string): void {
    this.sendMessage('edit_message', {
      messageId,
      newEncryptedContent
    });
  }

  public deleteMessage(messageId: string): void {
    this.sendMessage('delete_message', { messageId });
  }

  public startTyping(roomId: string): void {
    this.sendMessage('start_typing', { roomId });
  }

  public stopTyping(roomId: string): void {
    this.sendMessage('stop_typing', { roomId });
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
