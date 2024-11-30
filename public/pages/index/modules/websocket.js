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
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.uiManager = null;
        this.pingInterval = null;
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.onConnectionStatusChange("connecting", "Connecting...");

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.isConnected = true;
            this.reconnectDelay = INITIAL_DELAY;
            this.onConnectionStatusChange('connected', 'Connected');
            this.onOpen();

            // Start sending periodic pings
            this.startPinging();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'status_update' && this.uiManager) {
                this.uiManager.updateUserStatus(data.username, data.status);
            } else if (data.type === 'initial_status' && this.uiManager) {
                // Update UI with all online users
                data.users.forEach(user => {
                    this.uiManager.updateUserStatus(user.username, user.status);
                });
            } else if (data.type === 'ping') {
                // Handle ping response
            } else {
                this.onMessage(event);
            }
        };

        this.ws.onclose = () => {
            if (this.isConnected) {
                console.log("WebSocket connection closed");
                this.isConnected = false;
                this.onConnectionStatusChange('disconnected', 'Disconnected');
                this.handleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.onConnectionStatusChange('error', 'Connection error');
        };
    }

    disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onConnectionStatusChange('error', 'Failed to reconnect');
            return;
        }

        this.reconnectAttempts++;
        this.onConnectionStatusChange('connecting', `Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
    }

    send(data) {
        if (this.isConnected) {
            try {
                this.ws.send(JSON.stringify(data));
                return true;
            } catch (error) {
                console.error("Failed to send message:", error);
                this.onConnectionStatusChange("disconnected", "Failed to send message");
                this.handleReconnect();
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

    startPinging() {
        // Clear any existing ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        // Send a ping every 5 minutes
        this.pingInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Send initial ping
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }
}
