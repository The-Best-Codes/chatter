const jwt = require("jsonwebtoken");
const { WebSocket } = require("ws");
const Message = require("../models/messageModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");

// This will store all active client connections
// Map<userId, { ws: WebSocket, rooms: Set<string> }>
const clients = new Map();

function sendToClient(ws, event, payload) {
  ws.send(JSON.stringify({ event, payload }));
}

async function broadcastToRoom(roomId, event, payload, excludeUserId = null) {
  const roomMembers = await Room.getRoomMemberIds(roomId);
  for (const memberId of roomMembers) {
    if (memberId === excludeUserId) continue;

    const client = clients.get(memberId);
    // Check if the user is currently connected
    if (client && client.ws.readyState === WebSocket.OPEN) {
      sendToClient(client.ws, event, payload);
    }
  }
}

async function handleMessage(ws, rawMessage, userId) {
  let messageData;
  try {
    messageData = JSON.parse(rawMessage);
  } catch (error) {
    return sendToClient(ws, "error", { message: "Invalid JSON format." });
  }

  const { event, payload } = messageData;
  const user = await User.findById(userId); // Get full user object for permissions

  switch (event) {
    case "send_message": {
      const { roomId, encryptedContent, replyToMessageId, mentionedUserIds } =
        payload;
      if (!roomId || !encryptedContent) {
        return sendToClient(ws, "error", {
          message: "Missing roomId or content for send_message.",
        });
      }

      // TODO: Add permission checks here later (rate limiting, can_send_messages)

      try {
        const isMember = await Room.isUserInRoom(userId, roomId);
        if (!isMember) {
          return sendToClient(ws, "error", {
            message: "You are not a member of this room.",
          });
        }

        const message = await Message.create({
          senderId: userId,
          roomId,
          encryptedContent,
          replyToMessageId,
          mentionedUserIds,
        });

        // Broadcast the new message to everyone in the room (including the sender)
        await broadcastToRoom(roomId, "new_message", message);
      } catch (error) {
        console.error("Error handling send_message:", error);
        sendToClient(ws, "error", { message: "Could not send message." });
      }
      break;
    }

    case "edit_message": {
      // <-- NEW CASE
      const { messageId, newEncryptedContent } = payload;
      if (!messageId || !newEncryptedContent) {
        return sendToClient(ws, "error", {
          message: "Missing payload for edit_message.",
        });
      }

      // TODO: Add permission checks (can_edit_messages)

      try {
        const updatedMessage = await Message.edit(
          messageId,
          userId,
          newEncryptedContent,
        );
        if (!updatedMessage) {
          return sendToClient(ws, "error", {
            message: "Message not found or you do not have permission to edit.",
          });
        }

        await broadcastToRoom(
          updatedMessage.room_id,
          "message_edited",
          updatedMessage,
        );
      } catch (error) {
        console.error("Error handling edit_message:", error);
        sendToClient(ws, "error", { message: "Could not edit message." });
      }
      break;
    }

    case "delete_message": {
      // <-- NEW CASE
      const { messageId } = payload;
      if (!messageId) {
        return sendToClient(ws, "error", {
          message: "Missing messageId for delete_message.",
        });
      }

      // TODO: Add permission checks (can_delete_messages)

      try {
        const deletedMessage = await Message.softDelete(messageId, userId);
        if (!deletedMessage) {
          return sendToClient(ws, "error", {
            message:
              "Message not found or you do not have permission to delete.",
          });
        }

        await broadcastToRoom(deletedMessage.room_id, "message_deleted", {
          messageId: deletedMessage.id,
          roomId: deletedMessage.room_id,
        });
      } catch (error) {
        console.error("Error handling delete_message:", error);
        sendToClient(ws, "error", { message: "Could not delete message." });
      }
      break;
    }

    case "start_typing": {
      const { roomId } = payload;
      if (!roomId) return;
      // Broadcast to the room, excluding the user who is typing
      const { username, display_name } = await User.findById(userId);
      await broadcastToRoom(
        roomId,
        "user_typing",
        { roomId, userId, username, displayName: display_name },
        userId,
      );
      break;
    }

    case "stop_typing": {
      const { roomId } = payload;
      if (!roomId) return;
      await broadcastToRoom(
        roomId,
        "user_stopped_typing",
        { roomId, userId },
        userId,
      );
      break;
    }

    default:
      sendToClient(ws, "error", { message: `Unknown event type: ${event}` });
  }
}

function init(wss) {
  wss.on("connection", (ws) => {
    // A client has a short grace period to authenticate
    const authTimeout = setTimeout(() => {
      if (!ws.userId) {
        console.log("WS: Client failed to auth in time, disconnecting.");
        ws.close(1008, "Authentication timed out");
      }
    }, 5000); // 5 seconds

    ws.on("message", async (rawMessage) => {
      // The first message MUST be an auth message
      if (!ws.userId) {
        let messageData;
        try {
          messageData = JSON.parse(rawMessage);
        } catch (error) {
          return ws.close(1008, "Invalid JSON");
        }

        if (messageData.event === "auth" && messageData.payload.token) {
          try {
            const decoded = jwt.verify(
              messageData.payload.token,
              process.env.JWT_SECRET,
            );
            ws.userId = decoded.userId;

            // Fetch the rooms this user is part of
            const userRooms = await Room.getRoomsForUser(decoded.userId);

            clients.set(ws.userId, {
              ws,
              rooms: new Set(userRooms.map((r) => r.id)),
            });
            clearTimeout(authTimeout);

            console.log(`✅ WS Client authenticated: User ${ws.userId}`);
            sendToClient(ws, "authenticated", {
              message: "Authentication successful.",
            });
          } catch (error) {
            console.log("WS: Invalid token, disconnecting.");
            ws.close(1008, "Invalid token");
          }
        } else {
          ws.close(1008, "Authentication required");
        }
      } else {
        // If already authenticated, handle regular messages
        await handleMessage(ws, rawMessage, ws.userId);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        clients.delete(ws.userId);
        console.log(`❌ WS Client disconnected: User ${ws.userId}`);
      } else {
        console.log("WS: Unauthenticated client disconnected.");
      }
      clearTimeout(authTimeout);
    });

    ws.on("error", (error) => {
      console.error("WebSocket Error:", error);
    });
  });

  console.log("🔌 WebSocket service initialized.");
}

module.exports = { init, broadcastToRoom };
