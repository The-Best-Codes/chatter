export class UIManager {
  constructor() {
    this.messagesElement = document.getElementById("messages");
    this.messagesLoading = document.getElementById("messages-loading");
    this.messageForm = document.getElementById("message-form");
    this.messageInput = document.getElementById("message-input");
    this.typingIndicator = document.getElementById("typing-indicator");
    this.emptyState = document.getElementById("empty-state");
    this.sendButton = this.messageForm.querySelector('button[type="submit"]');
    this.reconnectButton = document.getElementById("reconnect-button");
    this.connectionStatus = document.getElementById("connection-status");
    this.connectionText = document.getElementById("connection-text");
    this.usersList = document.getElementById("users-list");
    this.users = new Map(); // Store user statuses

    // Mobile menu elements
    this.mobileMenuButton = document.getElementById("mobile-menu-button");
    this.sidebar = document.getElementById("sidebar");
    this.closeIcon = document.getElementById("close-icon");
    this.menuIcon = document.getElementById("menu-icon");

    this.setupMobileMenu();

    // Settings modal elements
    this.settingsModal = document.getElementById("settings-modal");
    this.settingsButton = document.getElementById("settings-button");
    this.closeSettingsButton = document.getElementById("close-settings-modal");
    this.themeSelect = document.getElementById("theme-select");
    this.notificationSelect = document.getElementById("notification-select");
    this.soundSelect = document.getElementById("sound-select");
    this.saveSettingsButton = document.getElementById("save-settings-button");

    this.setupSettingsModal();

    // Configure marked with custom renderers
    marked.use({
      renderer: {
        image(data) {
          return `<img
                        src="${data.href || ""}"
                        alt="${data.text || ""}"
                        ${data.title ? `title="${data.title}"` : ""}
                        class="w-80 h-60 bg-gray-500 animate-pulse"
                        onLoad="this.classList.remove('w-80', 'h-60', 'bg-gray-500', 'animate-pulse')"
                        loading="lazy"
                    >`;
        },
        link(data) {
          return `<a href="${data.href || ""}" target="_blank" rel="noopener noreferrer">${data.text || ""}</a>`;
        },
      },
      gfm: true,
      breaks: true,
    });

    this.setupTextareaAutoResize();

    // Setup send button state handling
    this.messageInput.addEventListener("input", () => {
      this.updateSendButtonState();
    });
    this.updateSendButtonState(); // Initial state
  }

  updateConnectionStatus(status, message) {
    this.connectionText.textContent = message;
    this.reconnectButton.classList.toggle("hidden", status !== "disconnected");

    // Update input state based on connection status
    this.messageInput.disabled = status !== "connected";
    if (status === "connected") {
      this.updateSendButtonState();
    } else {
      this.sendButton.disabled = true;
      this.sendButton.classList.add("opacity-50");
    }

    switch (status) {
      case "connected":
        this.connectionStatus.className = "h-2 w-2 rounded-full bg-green-500";
        this.connectionText.className =
          "text-sm text-green-600 dark:text-green-400";
        break;
      case "connecting":
        this.connectionStatus.className = "h-2 w-2 rounded-full bg-yellow-500";
        this.connectionText.className =
          "text-sm text-yellow-600 dark:text-yellow-400";
        break;
      case "disconnected":
        this.connectionStatus.className = "h-2 w-2 rounded-full bg-red-500";
        this.connectionText.className =
          "text-sm text-red-600 dark:text-red-400";
        break;
    }
  }

  createMessageElement(msg) {
    const messageElement = document.createElement("div");
    messageElement.className =
      "bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors duration-200 mb-4 last:mb-0 max-w-full overflow-auto";

    /* // First handle headers and other block-level elements
        const preprocessed = msg.content.split('\n').map(line => {
            // If line starts with #, treat it as a header
            if (line.trim().startsWith('#')) {
                return line;
            }
            // Otherwise replace newline with <br>
            return line + '<br>';
        }).join('\n'); */

    const preprocessed = msg.content;

    const renderedContent = marked.parse(preprocessed);

    messageElement.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-medium text-blue-600 dark:text-blue-400">${msg.username}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(
                  msg.created_at || new Date(),
                ).toLocaleTimeString()}</span>
            </div>
            <div class="mt-2 text-gray-800 dark:text-gray-200 inline-block">${renderedContent}</div>
        `;
    return messageElement;
  }

  appendMessage(msg) {
    const wasAtBottom = this.isNearBottom();
    const messageElement = this.createMessageElement(msg);
    this.messagesElement.appendChild(messageElement);
    this.updateEmptyState();
    if (wasAtBottom) {
      this.scrollToBottom(true);
    }
  }

  updateTypingIndicator(message) {
    this.typingIndicator.textContent = message;
  }

  isNearBottom() {
    const threshold = 150; // pixels from bottom
    return (
      this.messagesElement.scrollHeight -
        this.messagesElement.scrollTop -
        this.messagesElement.clientHeight <=
      threshold
    );
  }

  scrollToBottom(smooth = false) {
    this.messagesElement.scrollTo({
      top: this.messagesElement.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  updateEmptyState() {
    if (this.messagesElement.children.length === 1) {
      // Only empty-state div present
      this.emptyState.classList.remove("hidden");
    } else {
      this.emptyState.classList.add("hidden");
    }
  }

  showLoadingState() {
    this.messagesElement.style.display = "none";
    this.messagesLoading.style.display = "flex";
  }

  hideLoadingState() {
    this.messagesLoading.style.display = "none";
    this.messagesElement.style.display = "block";
  }

  setupTextareaAutoResize() {
    this.messageInput.addEventListener("input", () => {
      // Reset height to auto to get proper scrollHeight
      this.messageInput.style.height = "auto";
      // Set new height but cap it at max height
      const maxHeight = 150; // 150px max height
      const newHeight = Math.min(this.messageInput.scrollHeight + 2, maxHeight);
      this.messageInput.style.height = newHeight + "px";
    });
  }

  setupMobileMenu() {
    this.mobileMenuButton.addEventListener("click", () => {
      this.sidebar.classList.toggle("-translate-x-full");
      this.mobileMenuButton.classList.toggle("translate-x-48");
      this.closeIcon.classList.toggle("hidden");
      this.menuIcon.classList.toggle("hidden");
    });

    // Close sidebar when clicking outside
    document.addEventListener("click", (e) => {
      if (
        window.innerWidth < 1024 && // Only on mobile
        !this.sidebar.contains(e.target) &&
        !this.mobileMenuButton.contains(e.target) &&
        !this.sidebar.classList.contains("-translate-x-full")
      ) {
        this.sidebar.classList.add("-translate-x-full");
      }
    });
  }

  setupSettingsModal() {
    this.settingsButton.addEventListener("click", () => {
      this.settingsModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
    this.closeSettingsButton.addEventListener("click", () => {
      this.settingsModal.classList.add("hidden");
      document.body.style.overflow = "";
    });
    this.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.settingsModal) {
        this.settingsModal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    });
  }

  setSettings(settings) {
    this.themeSelect.value = settings.theme;
    this.notificationSelect.value = settings.notifications;
    this.soundSelect.value = settings.sound;
  }

  getMessageContent() {
    return this.messageInput.value.trim();
  }

  clearMessageInput() {
    this.messageInput.value = "";
    this.messageInput.style.height = "auto";
    this.updateSendButtonState();
  }

  showSending() {
    this.sendButton.disabled = true;
    this.sendButton.classList.add("opacity-50");
  }

  hideSending() {
    // Update send button state based on content after sending
    this.updateSendButtonState();
  }

  disableInput() {
    this.messageInput.disabled = true;
    this.sendButton.disabled = true;
    this.sendButton.classList.add("opacity-50");
  }

  enableInput() {
    this.messageInput.disabled = false;
    // Update send button state based on content
    this.updateSendButtonState();
  }

  updateSendButtonState() {
    const isEmpty = !this.getMessageContent();
    this.sendButton.disabled = isEmpty;
    this.sendButton.classList.toggle("opacity-50", isEmpty);
  }

  showError(message) {
    alert(message);
  }

  updateUserStatus(username, status) {
    this.users.set(username, status);
    this.renderUsers();
  }

  removeUser(username) {
    this.users.delete(username);
    this.renderUsers();
  }

  renderUsers() {
    if (!this.usersList) return;

    this.usersList.innerHTML = "";

    for (const [username, status] of this.users) {
      const userElement = document.createElement("div");
      userElement.className = "flex items-center gap-2 py-2";

      const statusDot = document.createElement("div");
      statusDot.className = `h-2 w-2 rounded-full ${
        status === "online" ? "bg-green-500" : "bg-red-500"
      }`;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = username;
      nameSpan.className = "text-sm";

      userElement.appendChild(statusDot);
      userElement.appendChild(nameSpan);
      this.usersList.appendChild(userElement);
    }
  }
}
