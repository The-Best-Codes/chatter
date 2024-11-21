document.addEventListener("DOMContentLoaded", () => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    const messagesElement = document.getElementById("messages");
    const messagesLoading = document.getElementById("messages-loading");
    const messageForm = document.getElementById("message-form");
    const messageInput = document.getElementById("message-input");
    const typingIndicator = document.getElementById("typing-indicator");
    const emptyState = document.getElementById("empty-state");
    const sendButton = messageForm.querySelector('button[type="submit"]');
    const sendText = sendButton.querySelector(".send-text");
    const sendingText = sendButton.querySelector(".sending-text");

    let typingTimeout;
    let isTyping = false;

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
        console.group("Scroll to bottom function called");
        console.log("Smooth:", smooth);
        console.log("Scroll height:", messagesElement.scrollHeight);
        console.log("Message children length:", messagesElement.children.length);
        messagesElement.scrollTo({
            top: messagesElement.scrollHeight,
            behavior: smooth ? "smooth" : "auto"
        });
        console.log("After scroll position:", messagesElement.scrollTop);
        console.log("(After scroll) Client height:", messagesElement.clientHeight);
        console.log("(After scroll) Scroll height:", messagesElement.scrollHeight);
        console.groupEnd();
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
    ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case "message":
                const messageElement = createMessageElement(data);
                messagesElement.appendChild(messageElement);
                updateEmptyState();
                if (isNearBottom()) {
                    scrollToBottom(true); // Smooth scroll for new messages
                }
                break;

            case "typing":
                typingIndicator.textContent = data.message;
                break;
        }
    });

    // Handle form submission
    messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (content) {
            // Show sending state
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
            } finally {
                // Hide sending state
                sendText.classList.remove("hidden");
                sendingText.classList.add("hidden");
                sendButton.disabled = false;
            }
        }
    });

    // Handle Shift+Enter
    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event("submit"));
        }
    });

    // Show loading state for messages
    messagesElement.style.display = "none";
    messagesLoading.style.display = "flex";

    ws.addEventListener("open", async () => {
        try {
            const response = await fetch("/messages");
            if (!response.ok) {
                throw new Error("Failed to load messages");
            }
            const messages = await response.json();

            console.log("Received messages:", messages);

            // With the current implementation, we need to reverse the array of messages
            // to display them in the correct order
            messages.reverse();

            console.groupCollapsed("Adding messages");
            messages.forEach((msg) => {
                const messageElement = createMessageElement(msg);
                console.log(messageElement);
                messagesElement.appendChild(messageElement);
            });
            console.groupEnd();
            console.log("Updating empty state");
            updateEmptyState();
        } catch (error) {
            console.error("Error loading messages:", error);
        } finally {
            // Hide loading state and show messages
            messagesLoading.style.display = "none";
            messagesElement.style.display = "block";

            // Now that the container is visible, scroll to bottom
            requestAnimationFrame(() => {
                scrollToBottom(false);
            });
        }
    });
});