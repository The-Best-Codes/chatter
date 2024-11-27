export class ChatManager {
    constructor(websocketManager, uiManager, audioManager, settingsManager, notificationManager, userManager) {
        this.websocketManager = websocketManager;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        this.settingsManager = settingsManager;
        this.notificationManager = notificationManager;
        this.userManager = userManager;
        this.typingTimeout = null;
        this.isTyping = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle form submission
        this.uiManager.messageForm.addEventListener("submit", (e) => this.handleSubmit(e));

        // Handle keydown for Enter key
        this.uiManager.messageInput.addEventListener("keydown", (e) => this.handleKeydown(e));

        // Handle typing status
        this.uiManager.messageInput.addEventListener("input", () => this.handleTyping());

        // Handle reconnect button
        this.uiManager.reconnectButton.addEventListener("click", () => {
            this.websocketManager.manualReconnect();
        });

        // Handle message edit
        this.uiManager.messagesElement.addEventListener("click", (e) => this.handleEditMessage(e));

        // Handle message delete
        this.uiManager.messagesElement.addEventListener("click", (e) => this.handleDeleteMessage(e));

        // Handle message reaction
        this.uiManager.messagesElement.addEventListener("click", (e) => this.handleReaction(e));
    }

    handleSubmit(e) {
        e.preventDefault();

        // Prevent sending if not connected
        if (!this.websocketManager.isConnectedStatus()) {
            return;
        }

        const content = this.uiManager.getMessageContent();
        if (content) {
            this.uiManager.showSending();

            const success = this.websocketManager.send({
                type: "message",
                content,
            });

            if (success) {
                this.uiManager.clearMessageInput();
            }

            this.uiManager.hideSending();
        }
    }

    handleKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            // Prevent sending if not connected
            if (!this.websocketManager.isConnectedStatus()) {
                e.preventDefault();
                return;
            }

            const content = this.uiManager.getMessageContent();
            if (content) {
                e.preventDefault();
                this.uiManager.messageForm.dispatchEvent(new Event("submit"));
            }
        }
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendTypingStatus(true);
        }

        // Clear previous timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingStatus(false);
        }, 1000);
    }

    sendTypingStatus(isTyping) {
        this.websocketManager.send({
            type: "typing",
            isTyping: isTyping
        });
    }

    async handleInitialLoad() {
        try {
            const response = await fetch("/messages");
            if (!response.ok) {
                throw new Error("Failed to load messages");
            }
            const messages = await response.json();
            messages.reverse();

            messages.forEach((msg) => {
                this.uiManager.appendMessage(msg);
            });
            this.uiManager.updateEmptyState();
        } catch (error) {
            console.error("Error loading messages:", error);
        } finally {
            this.uiManager.hideLoadingState();
            requestAnimationFrame(() => {
                this.uiManager.scrollToBottom(false);
            });
        }
    }

    handleWebSocketMessage(event) {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case "message":
                this.uiManager.appendMessage(data);
                this.audioManager.playMessageNotification();
                if (!this.userManager.isCurrentUser(data.username)) {
                    this.notificationManager.notify('New Message', {
                        body: `${data.username}: ${data.content}`,
                        tag: 'chat-message'
                    });
                }
                break;

            case "typing":
                this.uiManager.updateTypingIndicator(data.message);
                break;

            case "read_receipt":
                this.uiManager.updateReadReceipt(data.messageId, data.username);
                break;

            case "reaction":
                this.uiManager.updateReaction(data.messageId, data.reaction, data.username);
                break;

            case "edit_message":
                this.uiManager.updateEditedMessage(data.messageId, data.newContent, data.username);
                break;

            case "delete_message":
                this.uiManager.removeMessage(data.messageId, data.username);
                break;
        }
    }

    handleEditMessage(e) {
        if (e.target.classList.contains("edit-message")) {
            const messageId = e.target.dataset.messageId;
            const newContent = prompt("Edit your message:");
            if (newContent) {
                this.websocketManager.send({
                    type: "edit_message",
                    messageId,
                    newContent,
                });
            }
        }
    }

    handleDeleteMessage(e) {
        if (e.target.classList.contains("delete-message")) {
            const messageId = e.target.dataset.messageId;
            if (confirm("Are you sure you want to delete this message?")) {
                this.websocketManager.send({
                    type: "delete_message",
                    messageId,
                });
            }
        }
    }

    handleReaction(e) {
        if (e.target.classList.contains("reaction")) {
            const messageId = e.target.dataset.messageId;
            const reaction = e.target.dataset.reaction;
            this.websocketManager.send({
                type: "reaction",
                messageId,
                reaction,
            });
        }
    }
}
