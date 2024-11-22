import { WebSocketManager } from './websocket.js';
import { UIManager } from './ui.js';
import { ChatManager } from './chat.js';
import { AudioManager } from './audio.js';

document.addEventListener("DOMContentLoaded", () => {
    // Initialize managers
    const uiManager = new UIManager();
    const audioManager = new AudioManager();

    // Show initial loading state
    uiManager.showLoadingState();

    // Initialize WebSocket manager with callbacks
    const websocketManager = new WebSocketManager(
        // onOpen callback
        async () => {
            await chatManager.handleInitialLoad();
        },
        // onMessage callback
        (event) => {
            chatManager.handleWebSocketMessage(event);
        },
        // onConnectionStatusChange callback
        (status, message) => {
            uiManager.updateConnectionStatus(status, message);
        }
    );

    // Initialize chat manager
    const chatManager = new ChatManager(websocketManager, uiManager, audioManager);

    // Start WebSocket connection
    websocketManager.connect();
});
