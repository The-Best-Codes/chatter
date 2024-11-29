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

        // Configure marked with custom renderers
        marked.use({
            renderer: {
                image(data) {
                    return `<img 
                        src="${data.href || ''}" 
                        alt="${data.text || ''}" 
                        ${data.title ? `title="${data.title}"` : ''} 
                        class="w-80 h-60 bg-gray-500 animate-pulse"
                        onLoad="this.classList.remove('w-80', 'h-60', 'bg-gray-500', 'animate-pulse')" 
                        loading="lazy"
                    >`;
                },
                link(data) {
                    return `<a href="${data.href || ''}" target="_blank" rel="noopener noreferrer">${data.text || ''}</a>`;
                }
            },
            gfm: true,
            breaks: true
        });

        this.setupTextareaAutoResize();
    }

    updateConnectionStatus(status, message) {
        this.connectionText.textContent = message;
        this.reconnectButton.classList.toggle("hidden", status !== "disconnected");

        // Disable/enable send button based on connection status
        this.sendButton.disabled = status !== "connected";
        this.sendButton.classList.toggle("opacity-50", status !== "connected");
        this.messageInput.disabled = status !== "connected";

        switch (status) {
            case "connected":
                this.connectionStatus.className = "h-2 w-2 rounded-full bg-green-500";
                this.connectionText.className = "text-sm text-green-600 dark:text-green-400";
                break;
            case "connecting":
                this.connectionStatus.className = "h-2 w-2 rounded-full bg-yellow-500";
                this.connectionText.className = "text-sm text-yellow-600 dark:text-yellow-400";
                break;
            case "disconnected":
                this.connectionStatus.className = "h-2 w-2 rounded-full bg-red-500";
                this.connectionText.className = "text-sm text-red-600 dark:text-red-400";
                break;
        }
    }

    createMessageElement(msg) {
        const messageElement = document.createElement("div");
        messageElement.className =
            "bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors duration-200 mb-4 last:mb-0 max-w-full overflow-auto";

        // Sanitize and render markdown
        const renderedContent = marked.parse(msg.content);

        messageElement.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="font-medium text-blue-600 dark:text-blue-400">${msg.username}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(
            msg.timestamp || new Date()
        ).toLocaleTimeString()}</span>
            </div>
            <div class="mt-2 text-gray-800 dark:text-gray-200">${renderedContent}</div>
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
            behavior: smooth ? "smooth" : "auto"
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

    getMessageContent() {
        return this.messageInput.value.trim();
    }

    clearMessageInput() {
        this.messageInput.value = "";
        this.messageInput.style.height = "auto";
    }

    showSending() {
        this.sendButton.disabled = true;
        this.sendButton.classList.add('opacity-50');
    }

    hideSending() {
        this.sendButton.disabled = false;
        this.sendButton.classList.remove('opacity-50');
    }

    disableInput() {
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        this.sendButton.classList.add('opacity-50');
    }

    enableInput() {
        this.messageInput.disabled = false;
        this.sendButton.disabled = false;
        this.sendButton.classList.remove('opacity-50');
    }

    showError(message) {
        alert(message);
    }
}
