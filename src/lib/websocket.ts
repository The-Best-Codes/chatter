import { WebSocketServer, WebSocket } from 'ws';
import { Message } from './api/room-messages';
import { decryptMessage } from './encryption';

// Define message types for WebSocket communication
export enum WebSocketMessageType {
  ROOM_MESSAGE = 'ROOM_MESSAGE',
  DM_MESSAGE = 'DM_MESSAGE',
  MESSAGE_EDITED = 'MESSAGE_EDITED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  USER_TYPING = 'USER_TYPING',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  ERROR = 'ERROR',
}

// Define WebSocket message interface
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  roomId?: string;
  dmId?: string;
  userId?: string;
}

// Define client connection interface
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
  dms: Set<string>;
}

// WebSocket server class
export class ChatWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      // Extract user ID and token from request
      const url = new URL(request.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      const token = url.searchParams.get('token');

      // Validate user (in a real app, you'd verify the token)
      if (!userId) {
        ws.send(JSON.stringify({
          type: WebSocketMessageType.ERROR,
          payload: { message: 'Authentication required' }
        }));
        ws.close();
        return;
      }

      // Store client connection
      const client: ClientConnection = {
        ws,
        userId,
        rooms: new Set(),
        dms: new Set()
      };
      this.clients.set(userId, client);

      // Handle messages from client
      ws.on('message', (data: string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data);
          this.handleClientMessage(userId, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({
            type: WebSocketMessageType.ERROR,
            payload: { message: 'Invalid message format' }
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        // Notify rooms that user has left
        client.rooms.forEach(roomId => {
          this.broadcastToRoom(roomId, {
            type: WebSocketMessageType.USER_LEFT,
            payload: { userId },
            roomId
          }, userId);
        });
        
        // Remove client
        this.clients.delete(userId);
      });
    });
  }

  private handleClientMessage(userId: string, message: WebSocketMessage) {
    const client = this.clients.get(userId);
    if (!client) return;

    switch (message.type) {
      case WebSocketMessageType.ROOM_MESSAGE:
        if (message.roomId) {
          // Join room if not already joined
          client.rooms.add(message.roomId);
          // Broadcast message to all clients in the room
          this.broadcastToRoom(message.roomId, message);
        }
        break;
        
      case WebSocketMessageType.DM_MESSAGE:
        if (message.dmId) {
          // Join DM if not already joined
          client.dms.add(message.dmId);
          // Send message to the other user in the DM
          this.sendToDM(message.dmId, message);
        }
        break;
        
      case WebSocketMessageType.USER_TYPING:
        if (message.roomId) {
          this.broadcastToRoom(message.roomId, message, userId);
        } else if (message.dmId) {
          this.sendToDM(message.dmId, message);
        }
        break;
        
      case WebSocketMessageType.USER_JOINED:
        if (message.roomId) {
          client.rooms.add(message.roomId);
          this.broadcastToRoom(message.roomId, message);
        }
        break;
        
      case WebSocketMessageType.USER_LEFT:
        if (message.roomId) {
          client.rooms.delete(message.roomId);
          this.broadcastToRoom(message.roomId, message);
        }
        break;
        
      case WebSocketMessageType.MESSAGE_EDITED:
      case WebSocketMessageType.MESSAGE_DELETED:
        if (message.roomId) {
          this.broadcastToRoom(message.roomId, message);
        } else if (message.dmId) {
          this.sendToDM(message.dmId, message);
        }
        break;
    }
  }

  // Broadcast message to all clients in a room
  public broadcastToRoom(roomId: string, message: WebSocketMessage, excludeUserId?: string) {
    this.clients.forEach((client, userId) => {
      if (excludeUserId && userId === excludeUserId) return;
      if (client.rooms.has(roomId)) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Send message to users in a DM conversation
  public sendToDM(dmId: string, message: WebSocketMessage) {
    this.clients.forEach((client) => {
      if (client.dms.has(dmId)) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Send a room message to all clients in the room
  public sendRoomMessage(roomId: string, message: Message, senderId: string) {
    this.broadcastToRoom(roomId, {
      type: WebSocketMessageType.ROOM_MESSAGE,
      payload: message,
      roomId,
      userId: senderId
    });
  }

  // Send a DM message to users in the conversation
  public sendDMMessage(dmId: string, message: Message, senderId: string) {
    this.sendToDM(dmId, {
      type: WebSocketMessageType.DM_MESSAGE,
      payload: message,
      dmId,
      userId: senderId
    });
  }

  // Notify about message edit
  public notifyMessageEdited(message: Message) {
    if (message.roomId) {
      this.broadcastToRoom(message.roomId, {
        type: WebSocketMessageType.MESSAGE_EDITED,
        payload: message,
        roomId: message.roomId,
        userId: message.senderId
      });
    } else if (message.dmId) {
      this.sendToDM(message.dmId, {
        type: WebSocketMessageType.MESSAGE_EDITED,
        payload: message,
        dmId: message.dmId,
        userId: message.senderId
      });
    }
  }

  // Notify about message deletion
  public notifyMessageDeleted(messageId: string, roomId?: string, dmId?: string, senderId?: string) {
    if (roomId) {
      this.broadcastToRoom(roomId, {
        type: WebSocketMessageType.MESSAGE_DELETED,
        payload: { messageId },
        roomId,
        userId: senderId
      });
    } else if (dmId) {
      this.sendToDM(dmId, {
        type: WebSocketMessageType.MESSAGE_DELETED,
        payload: { messageId },
        dmId,
        userId: senderId
      });
    }
  }
}

// Singleton instance
let wsServer: ChatWebSocketServer | null = null;

// Initialize WebSocket server
export function initWebSocketServer(server: any) {
  if (!wsServer) {
    wsServer = new ChatWebSocketServer(server);
  }
  return wsServer;
}

// Get WebSocket server instance
export function getWebSocketServer() {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
}