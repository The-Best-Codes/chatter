import type { Message } from "./api/room-messages";
import { decryptMessage } from "./encryption-simplified";

// Define message types for WebSocket communication
export enum WebSocketMessageType {
  ROOM_MESSAGE = "ROOM_MESSAGE",
  DM_MESSAGE = "DM_MESSAGE",
  MESSAGE_EDITED = "MESSAGE_EDITED",
  MESSAGE_DELETED = "MESSAGE_DELETED",
  USER_TYPING = "USER_TYPING",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
  ERROR = "ERROR",
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
  ws: any; // Using any for compatibility with both WebSocket and ServerWebSocket
  userId: string;
  rooms: Set<string>;
  dms: Set<string>;
}

// WebSocket server class
export class ChatWebSocketServer {
  private clients: Map<string, ClientConnection> = new Map();
  public server: any;

  constructor(server: any) {
    // With Bun, we don't need to initialize a WebSocketServer
    // The server handles WebSocket connections directly
    this.server = server;
    console.log("WebSocket server initialized");
  }

  // Add a new client connection
  public addClient(ws: any, userId: string) {
    console.log(`WebSocket client connected: ${userId}`);

    const client: ClientConnection = {
      ws,
      userId,
      rooms: new Set(),
      dms: new Set(),
    };

    this.clients.set(userId, client);

    // Handle messages from client - support both browser WebSocket and Bun's ServerWebSocket
    if (typeof ws.addEventListener === 'function') {
      // Browser WebSocket
      ws.addEventListener("message", (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data as string);
          this.handleClientMessage(userId, message);
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              payload: { message: "Invalid message format" },
            }),
          );
        }
      });
      
      ws.addEventListener("close", () => {
        this.handleClientDisconnect(userId);
      });
    } else {
      // Bun's ServerWebSocket - message handling is done through the message event in server config
      // We'll handle the message event in the server config
      // The close event is also handled in the server config
    }
    
    return client;
  }
  
  // Handle client disconnect
  public handleClientDisconnect(userId: string) {
    console.log(`WebSocket client disconnected: ${userId}`);
    const client = this.clients.get(userId);

    if (client) {
      // Notify rooms that user has left
      client.rooms.forEach((roomId) => {
        this.broadcastToRoom(
          roomId,
          {
            type: WebSocketMessageType.USER_LEFT,
            payload: { userId },
            roomId,
          },
          userId,
        );
      });

      // Remove client
      this.clients.delete(userId);
    }
  }

  public handleClientMessage(userId: string, message: WebSocketMessage) {
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
  public broadcastToRoom(
    roomId: string,
    message: WebSocketMessage,
    excludeUserId?: string,
  ) {
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
      userId: senderId,
    });
  }

  // Send a DM message to users in the conversation
  public sendDMMessage(dmId: string, message: Message, senderId: string) {
    this.sendToDM(dmId, {
      type: WebSocketMessageType.DM_MESSAGE,
      payload: message,
      dmId,
      userId: senderId,
    });
  }

  // Notify about message edit
  public notifyMessageEdited(message: Message) {
    if (message.roomId) {
      this.broadcastToRoom(message.roomId, {
        type: WebSocketMessageType.MESSAGE_EDITED,
        payload: message,
        roomId: message.roomId,
        userId: message.senderId,
      });
    } else if (message.dmId) {
      this.sendToDM(message.dmId, {
        type: WebSocketMessageType.MESSAGE_EDITED,
        payload: message,
        dmId: message.dmId,
        userId: message.senderId,
      });
    }
  }

  // Notify about message deletion
  public notifyMessageDeleted(
    messageId: string,
    roomId?: string,
    dmId?: string,
    senderId?: string,
  ) {
    if (roomId) {
      this.broadcastToRoom(roomId, {
        type: WebSocketMessageType.MESSAGE_DELETED,
        payload: { messageId },
        roomId,
        userId: senderId,
      });
    } else if (dmId) {
      this.sendToDM(dmId, {
        type: WebSocketMessageType.MESSAGE_DELETED,
        payload: { messageId },
        dmId,
        userId: senderId,
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
  } else if (server && !wsServer.server) {
    // Update the server reference if it was initialized with null
    wsServer.server = server;
  }
  return wsServer;
}

// Get WebSocket server instance
export function getWebSocketServer() {
  if (!wsServer) {
    // Initialize with a default instance if not already initialized
    wsServer = new ChatWebSocketServer(null);
    console.warn("WebSocket server was auto-initialized with null server");
  }
  return wsServer;
}
