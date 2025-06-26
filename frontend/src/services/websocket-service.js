class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.currentToken = null;
    this.connectionPromise = null;
  }

  connect(token) {
    // If already connected with the same token, return resolved promise
    if (this.isConnected && this.currentToken === token) {
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // If there's an existing connection, close it first
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.disconnect();
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.currentToken = token; // Store token for reconnections
        const wsUrl = `ws://localhost:8080`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          // Send authentication message immediately when connection opens
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event: "auth", payload: { token } }));
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { event: eventType, payload } = data;

            if (eventType === "authenticated") {
              this.isConnected = true;
              this.isConnecting = false;
              this.reconnectAttempts = 0;
              this.connectionPromise = null;
              console.log("WebSocket authenticated");
              resolve();
            } else if (eventType === "error") {
              console.error("WebSocket error:", payload.message);
              if (!this.isConnected) {
                this.isConnecting = false;
                this.connectionPromise = null;
                reject(new Error(payload.message));
              }
            } else {
              // Handle other message types
              this.handleMessage(eventType, payload);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.isConnected = false;
          this.isConnecting = false;
          this.connectionPromise = null;

          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts &&
            this.currentToken // Only reconnect if we have a token
          ) {
            // Attempt to reconnect
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(
                `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
              );
              this.connect(this.currentToken);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (!this.isConnected) {
            this.isConnecting = false;
            this.connectionPromise = null;
            reject(error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.currentToken = null;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  send(event, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  // Check if websocket is connected and ready
  isReady() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get current connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Message handling
  handleMessage(eventType, payload) {
    const handlers = this.messageHandlers.get(eventType) || [];
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in message handler for ${eventType}:`, error);
      }
    });
  }

  on(eventType, handler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType).push(handler);
  }

  off(eventType, handler) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Chat-specific methods
  sendMessage(
    roomId,
    encryptedContent,
    replyToMessageId = null,
    mentionedUserIds = [],
  ) {
    this.send("send_message", {
      roomId,
      encryptedContent,
      replyToMessageId,
      mentionedUserIds,
    });
  }

  editMessage(messageId, newEncryptedContent) {
    this.send("edit_message", {
      messageId,
      newEncryptedContent,
    });
  }

  deleteMessage(messageId) {
    this.send("delete_message", {
      messageId,
    });
  }

  pinMessage(roomId, messageId) {
    this.send("pin_message", {
      roomId,
      messageId,
    });
  }

  unpinMessage(roomId, messageId) {
    this.send("unpin_message", {
      roomId,
      messageId,
    });
  }

  startTyping(roomId) {
    this.send("start_typing", { roomId });
  }

  stopTyping(roomId) {
    this.send("stop_typing", { roomId });
  }
}

export default new WebSocketService();
