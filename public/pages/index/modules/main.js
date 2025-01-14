import { AudioManager } from "./audio.js";
import { ChatManager } from "./chat.js";
import { NotificationManager } from "./notifications.js";
import { SettingsManager } from "./settings.js";
import { UIManager } from "./ui.js";
import { UploadManager } from "./upload.js";
import { UserManager } from "./user.js";
import { WebSocketManager } from "./websocket.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize managers
  const settingsManager = new SettingsManager();
  const notificationManager = new NotificationManager(settingsManager);
  const uiManager = new UIManager();
  const audioManager = new AudioManager(settingsManager);
  const userManager = new UserManager();
  const uploadManager = new UploadManager(uiManager);

  // Load and apply initial settings
  const initialSettings = settingsManager.getAllSettings();
  settingsManager.applyTheme(initialSettings.theme);
  uiManager.setSettings(initialSettings);

  // Setup settings save function
  uiManager.saveSettingsButton.addEventListener("click", () => {
    const theme = uiManager.themeSelect.value;
    const notifications = uiManager.notificationSelect.value;
    const sound = uiManager.soundSelect.value;

    settingsManager.setSetting("theme", theme);
    settingsManager.setSetting("notifications", notifications);
    settingsManager.setSetting("sound", sound);

    // Apply theme to page
    settingsManager.applyTheme(theme);

    // Update modules
    notificationManager.updateNotificationPermission();

    // Close modal
    uiManager.settingsModal.classList.add("hidden");
    document.body.style.overflow = "";
  });

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
      },
    );

    // Set UI manager in WebSocket manager for status updates
    websocketManager.setUIManager(uiManager);

    // Initialize chat manager
    const chatManager = new ChatManager(
      websocketManager,
      uiManager,
      audioManager,
      settingsManager,
      notificationManager,
      userManager,
    );

    // Start WebSocket connection
    websocketManager.connect();
  } catch (error) {
    console.error("Failed to initialize:", error);
    uiManager.updateConnectionStatus(
      "error",
      "Failed to initialize application",
    );
  }
});
