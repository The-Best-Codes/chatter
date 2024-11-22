// Constants for WebSocket connection
const MAX_RECONNECT_DELAY = 30000; // Maximum reconnection delay of 30 seconds
const INITIAL_DELAY = 1000; // Start with 1 second delay

export class WebSocketManager {
    constructor(onOpen, onMessage, onConnectionStatusChange) {
        this.ws = null;
        this.reconnectDelay = INITIAL_DELAY;
        this.reconnectTimeout = null;
        this.isConnected = false;
        this.onOpen = onOpen;
        this.onMessage = onMessage;
        this.onConnectionStatusChange = onConnectionStatusChange;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        this.onConnectionStatusChange("connecting", "Connecting...");

        this.ws = new WebSocket(`ws://${window.location.host}/ws`);
        this.ws.addEventListener("open", () => this.handleOpen());
        this.ws.addEventListener("message", (event) => this.handleMessage(event));
        this.ws.addEventListener("close", () => this.handleClose());
        this.ws.addEventListener("error", (error) => this.handleError(error));
    }

    async handleOpen() {
        this.isConnected = true;
        this.reconnectDelay = INITIAL_DELAY;
        this.onConnectionStatusChange("connected", "Connected");
        await this.onOpen();
    }

    handleClose() {
        if (this.isConnected) {
            console.log("WebSocket connection closed");
            this.isConnected = false;
            this.onConnectionStatusChange("disconnected", "Disconnected");
            this.scheduleReconnect();
        }
    }

    handleError(error) {
        console.error("WebSocket error:", error);
        this.onConnectionStatusChange("disconnected", "Connection error");
    }

    handleMessage(event) {
        this.onMessage(event);
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            console.log(`Attempting to reconnect in ${this.reconnectDelay}ms...`);
            this.connect();
            // Exponential backoff with maximum delay
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
        }, this.reconnectDelay);
    }

    send(data) {
        if (this.isConnected) {
            try {
                this.ws.send(JSON.stringify(data));
                return true;
            } catch (error) {
                console.error("Failed to send message:", error);
                this.onConnectionStatusChange("disconnected", "Failed to send message");
                this.scheduleReconnect();
                return false;
            }
        }
        return false;
    }

    manualReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectDelay = INITIAL_DELAY;
        this.connect();
    }

    isConnectedStatus() {
        return this.isConnected;
    }
}
