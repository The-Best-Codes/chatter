import { WebSocketManager } from './websocket.js';
import { UIManager } from './ui.js';
import { ChatManager } from './chat.js';
import { AudioManager } from './audio.js';
import { SettingsManager } from './settings.js';
import { NotificationManager } from './notifications.js';
import { UserManager } from './user.js';
import { UploadManager } from './upload.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize managers
    const settingsManager = new SettingsManager();
    const notificationManager = new NotificationManager(settingsManager);
    const uiManager = new UIManager();
    const audioManager = new AudioManager(settingsManager);
    const userManager = new UserManager();
    const uploadManager = new UploadManager(uiManager);

    try {
        // Initialize user info first
        await userManager.initialize();

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
        const chatManager = new ChatManager(websocketManager, uiManager, audioManager, settingsManager, notificationManager, userManager);

        // Start WebSocket connection
        websocketManager.connect();
    } catch (error) {
        console.error('Failed to initialize:', error);
        uiManager.updateConnectionStatus('error', 'Failed to initialize application');
    }
});
