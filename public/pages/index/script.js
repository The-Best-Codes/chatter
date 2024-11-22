document.addEventListener("DOMContentLoaded", () => {
    let ws = null;
    const MAX_RECONNECT_DELAY = 30000; // Maximum reconnection delay of 30 seconds
    const INITIAL_DELAY = 1000; // Start with 1 second delay
    let reconnectDelay = INITIAL_DELAY;
    let reconnectTimeout = null;
    let isConnected = false;

    const messagesElement = document.getElementById("messages");
    const messagesLoading = document.getElementById("messages-loading");
    const messageForm = document.getElementById("message-form");
    const messageInput = document.getElementById("message-input");
    const typingIndicator = document.getElementById("typing-indicator");
    const emptyState = document.getElementById("empty-state");
    const sendButton = messageForm.querySelector('button[type="submit"]');
    const sendText = sendButton.querySelector(".send-text");
    const sendingText = sendButton.querySelector(".sending-text");
    const reconnectButton = document.getElementById("reconnect-button");
    const connectionStatus = document.getElementById("connection-status");
    const connectionText = document.getElementById("connection-text");

    let typingTimeout;
    let isTyping = false;

    // Update UI based on connection status
    function updateConnectionStatus(status, message) {
        connectionText.textContent = message;
        reconnectButton.classList.toggle("hidden", status !== "disconnected");

        // Disable/enable send button based on connection status
        sendButton.disabled = status !== "connected";
        sendButton.classList.toggle("opacity-50", status !== "connected");
        messageInput.disabled = status !== "connected";

        switch (status) {
            case "connected":
                connectionStatus.className = "h-2 w-2 rounded-full bg-green-500";
                connectionText.className = "text-sm text-green-600 dark:text-green-400";
                break;
            case "connecting":
                connectionStatus.className = "h-2 w-2 rounded-full bg-yellow-500";
                connectionText.className = "text-sm text-yellow-600 dark:text-yellow-400";
                break;
            case "disconnected":
                connectionStatus.className = "h-2 w-2 rounded-full bg-red-500";
                connectionText.className = "text-sm text-red-600 dark:text-red-400";
                break;
        }
    }

    // Initialize WebSocket connection
    function connectWebSocket() {
        if (ws) {
            ws.close();
        }

        updateConnectionStatus("connecting", "Connecting...");

        ws = new WebSocket(`ws://${window.location.host}/ws`);

        ws.addEventListener("open", handleWebSocketOpen);
        ws.addEventListener("message", handleWebSocketMessage);
        ws.addEventListener("close", handleWebSocketClose);
        ws.addEventListener("error", handleWebSocketError);
    }

    // Handle WebSocket open event
    async function handleWebSocketOpen() {
        isConnected = true;
        reconnectDelay = INITIAL_DELAY; // Reset reconnect delay on successful connection
        updateConnectionStatus("connected", "Connected");

        try {
            const response = await fetch("/messages");
            if (!response.ok) {
                throw new Error("Failed to load messages");
            }
            const messages = await response.json();
            messages.reverse();

            messages.forEach((msg) => {
                const messageElement = createMessageElement(msg);
                messagesElement.appendChild(messageElement);
            });
            updateEmptyState();
        } catch (error) {
            console.error("Error loading messages:", error);
        } finally {
            messagesLoading.style.display = "none";
            messagesElement.style.display = "block";
            requestAnimationFrame(() => {
                scrollToBottom(false);
            });
        }
    }

    // Handle WebSocket close event
    function handleWebSocketClose() {
        if (isConnected) {
            console.log("WebSocket connection closed");
            isConnected = false;
            updateConnectionStatus("disconnected", "Disconnected");
            scheduleReconnect();
        }
    }

    // Handle WebSocket error event
    function handleWebSocketError(error) {
        console.error("WebSocket error:", error);
        updateConnectionStatus("disconnected", "Connection error");
    }

    // Schedule reconnection with exponential backoff
    function scheduleReconnect() {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }

        reconnectTimeout = setTimeout(() => {
            console.log(`Attempting to reconnect in ${reconnectDelay}ms...`);
            connectWebSocket();
            // Exponential backoff with maximum delay
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        }, reconnectDelay);
    }

    // Handle manual reconnection
    reconnectButton.addEventListener("click", () => {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        reconnectDelay = INITIAL_DELAY; // Reset delay on manual reconnect
        connectWebSocket();
    });

    // Function to check if user is near bottom
    function isNearBottom() {
        const threshold = 150; // pixels from bottom
        return (
            messagesElement.scrollHeight -
            messagesElement.scrollTop -
            messagesElement.clientHeight <=
            threshold
        );
    }

    // Function to scroll to bottom with optional smooth behavior
    function scrollToBottom(smooth = false) {
        messagesElement.scrollTo({
            top: messagesElement.scrollHeight,
            behavior: smooth ? "smooth" : "auto"
        });
    }

    // Function to update empty state visibility
    function updateEmptyState() {
        if (messagesElement.children.length === 1) {
            // Only empty-state div present
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
        }
    }

    // Create message element function
    function createMessageElement(msg) {
        const messageElement = document.createElement("div");
        messageElement.className =
            "bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors duration-200 mb-4 last:mb-0";

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

    // Function to send typing status
    function sendTypingStatus(isTyping) {
        ws.send(JSON.stringify({
            type: "typing",
            isTyping: isTyping
        }));
    }

    // Auto-resize textarea with max height
    messageInput.addEventListener("input", function () {
        // Reset height to auto to get proper scrollHeight
        this.style.height = "auto";
        // Set new height but cap it at max height
        const maxHeight = 150; // 150px max height
        const newHeight = Math.min(this.scrollHeight + 2, maxHeight);
        this.style.height = newHeight + "px";

        // Handle typing indicator
        if (!isTyping) {
            isTyping = true;
            sendTypingStatus(true);
        }

        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set new timeout
        typingTimeout = setTimeout(() => {
            isTyping = false;
            sendTypingStatus(false);
        }, 1000);
    });

    // Handle WebSocket messages
    function handleWebSocketMessage(event) {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case "message":
                const messageElement = createMessageElement(data);
                messagesElement.appendChild(messageElement);
                updateEmptyState();
                if (isNearBottom()) {
                    scrollToBottom(true);
                }
                break;

            case "typing":
                typingIndicator.textContent = data.message;
                break;
        }
    }

    // Handle form submission
    messageForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Prevent sending if not connected
        if (!isConnected) {
            return;
        }

        const content = messageInput.value.trim();
        if (content) {
            sendText.classList.add("hidden");
            sendingText.classList.remove("hidden");
            sendButton.disabled = true;

            try {
                ws.send(
                    JSON.stringify({
                        type: "message",
                        content,
                    })
                );
                messageInput.value = "";
                messageInput.style.height = "auto";
            } catch (error) {
                console.error("Failed to send message:", error);
                updateConnectionStatus("disconnected", "Failed to send message");
                scheduleReconnect();
            } finally {
                sendText.classList.remove("hidden");
                sendingText.classList.add("hidden");
                sendButton.disabled = false;
            }
        }
    });

    // Handle keydown for Enter key
    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            // Prevent sending if not connected
            if (!isConnected) {
                e.preventDefault();
                return;
            }

            const content = messageInput.value.trim();
            if (content) {
                e.preventDefault();
                messageForm.dispatchEvent(new Event("submit"));
            }
        }
    });

    // Show loading state for messages
    messagesElement.style.display = "none";
    messagesLoading.style.display = "flex";

    // Initialize WebSocket connection
    connectWebSocket();
});