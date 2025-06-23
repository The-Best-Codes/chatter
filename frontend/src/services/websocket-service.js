class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.currentToken = null;
  }

  connect(token) {
    return new Promise((resolve, reject) => {
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
              this.reconnectAttempts = 0;
              console.log("WebSocket authenticated");
              resolve();
            } else if (eventType === "error") {
              console.error("WebSocket error:", payload.message);
              if (!this.isConnected) {
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

          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
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
            reject(error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
      this.isConnected = false;
      this.currentToken = null;
    }
  }

  send(event, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else {
      console.error("WebSocket is not connected");
    }
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

  startTyping(roomId) {
    this.send("start_typing", { roomId });
  }

  stopTyping(roomId) {
    this.send("stop_typing", { roomId });
  }
}

export default new WebSocketService();
