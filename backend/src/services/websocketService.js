import jsonWebToken from "jsonwebtoken";
import { WebSocket } from "ws";
import {
  create,
  edit,
  pin,
  softDelete,
  unpin,
} from "../models/messageModel.js";
import { getRoomMemberIds, isUserInRoom } from "../models/roomModel.js";
import { findById } from "../models/userModel.js";
import { canPinMessage, hasPermission } from "./permissionService.js";

const { verify } = jsonWebToken;

// This will store all active client connections
// Map<userId, Set<WebSocket>>
const clients = new Map();

/**
 * Broadcast to a specific user across all their connections
 */
export function broadcastToUser(userId, event, payload) {
  const userConnections = clients.get(userId);
  if (userConnections) {
    for (const ws of userConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        sendToClient(ws, event, payload);
      }
    }
  }
}

/**
 * Broadcast to multiple users
 */
export function broadcastToUsers(userIds, event, payload, excludeUserId = null) {
  for (const userId of userIds) {
    if (userId === excludeUserId) continue;
    broadcastToUser(userId, event, payload);
  }
}

function sendToClient(ws, event, payload) {
  ws.send(JSON.stringify({ event, payload }));
}

export async function broadcastToRoom(
  roomId,
  event,
  payload,
  excludeUserId = null,
) {
  const roomMembers = await getRoomMemberIds(roomId);
  for (const memberId of roomMembers) {
    if (memberId === excludeUserId) continue;

    const userConnections = clients.get(memberId);
    // Check if the user is currently connected and has active sessions
    if (userConnections) {
      for (const ws of userConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          sendToClient(ws, event, payload);
        }
      }
    }
  }
}

/**
 * Disconnect a specific user's websocket connection(s)
 * Used when user status is changed or user is deleted
 */
export function disconnectUser(userId) {
  const userConnections = clients.get(userId);
  if (userConnections) {
    // Terminate all websocket connections for this user
    for (const ws of userConnections) {
      ws.close(1008, "User session invalidated");
    }
    clients.delete(userId);
    console.log(`Disconnected all websocket(s) for user ${userId}`);
    return true;
  }
  return false;
}

async function handleMessage(ws, rawMessage, userId) {
  let messageData;
  try {
    messageData = JSON.parse(rawMessage);
  } catch (error) {
    return sendToClient(ws, "error", { message: "Invalid JSON format." });
  }

  const { event, payload } = messageData;
  const user = await findById(userId); // Get full user object for permissions

  switch (event) {
    case "send_message": {
      const { roomId, encryptedContent, replyToMessageId, mentionedUserIds } =
        payload;
      if (!roomId || !encryptedContent) {
        return sendToClient(ws, "error", {
          message: "Missing roomId or content for send_message.",
        });
      }

      // Check if user has permission to send messages
      const canSend = await hasPermission(userId, "can_send_messages");
      if (!canSend) {
        return sendToClient(ws, "error", {
          message: "You do not have permission to send messages.",
        });
      }

      try {
        const isMember = await isUserInRoom(userId, roomId);
        if (!isMember) {
          return sendToClient(ws, "error", {
            message: "You are not a member of this room.",
          });
        }

        const message = await create({
          senderId: userId,
          roomId,
          encryptedContent,
          replyToMessageId,
          mentionedUserIds,
        });

        const formattedMessage = {
          id: message.id,
          room_id: message.room_id,
          sender_id: message.sender_id,
          encrypted_content: message.encrypted_content,
          reply_to_message_id: message.reply_to_message_id,
          created_at: message.created_at,
          updated_at: message.updated_at,
          username: message.sender.username,
          display_name: message.sender.display_name,
          is_pinned: false,
          reactions: [],
          reply_to_message: message.reply_to_message,
        };

        // Broadcast the new message to everyone in the room (including the sender)
        await broadcastToRoom(roomId, "new_message", formattedMessage);
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

      // Check if user has permission to edit messages
      const canEdit = await hasPermission(userId, "can_edit_messages");
      if (!canEdit) {
        return sendToClient(ws, "error", {
          message: "You do not have permission to edit messages.",
        });
      }

      try {
        const updatedMessage = await edit(
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

      // Check if user has permission to delete messages
      const canDelete = await hasPermission(userId, "can_delete_messages");
      if (!canDelete) {
        return sendToClient(ws, "error", {
          message: "You do not have permission to delete messages.",
        });
      }

      try {
        const deletedMessage = await softDelete(messageId, userId);
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
      const { username, display_name } = await findById(userId);
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

    case "pin_message": {
      const { roomId, messageId } = payload;
      if (!roomId || !messageId) {
        return sendToClient(ws, "error", {
          message: "Missing roomId or messageId for pin_message.",
        });
      }

      // Check if user has permission to pin messages in this room
      const canPin = await canPinMessage(userId, roomId);
      if (!canPin) {
        return sendToClient(ws, "error", {
          message: "You do not have permission to pin messages in this room.",
        });
      }

      try {
        await pin(roomId, messageId, userId);
        await broadcastToRoom(roomId, "message_pinned", {
          messageId,
          roomId,
          isPinned: true,
        });
      } catch (error) {
        console.error("Error handling pin_message:", error);
        sendToClient(ws, "error", { message: "Could not pin message." });
      }
      break;
    }

    case "unpin_message": {
      const { roomId, messageId } = payload;
      if (!roomId || !messageId) {
        return sendToClient(ws, "error", {
          message: "Missing roomId or messageId for unpin_message.",
        });
      }

      // Check if user has permission to pin messages in this room
      const canPin = await canPinMessage(userId, roomId);
      if (!canPin) {
        return sendToClient(ws, "error", {
          message: "You do not have permission to unpin messages in this room.",
        });
      }

      try {
        await unpin(roomId, messageId);
        await broadcastToRoom(roomId, "message_pinned", {
          messageId,
          roomId,
          isPinned: false,
        });
      } catch (error) {
        console.error("Error handling unpin_message:", error);
        sendToClient(ws, "error", { message: "Could not unpin message." });
      }
      break;
    }

    default:
      sendToClient(ws, "error", { message: `Unknown event type: ${event}` });
  }
}

export function init(wss) {
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
            const decoded = verify(
              messageData.payload.token,
              process.env.JWT_SECRET,
            );
            ws.userId = decoded.userId;

            // Add the new connection to the set for this user
            if (!clients.has(ws.userId)) {
              clients.set(ws.userId, new Set());
            }
            clients.get(ws.userId).add(ws);
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
        const userConnections = clients.get(ws.userId);
        if (userConnections) {
          // Remove the specific connection that closed
          userConnections.delete(ws);
          // If the user has no more open connections, remove their entry
          if (userConnections.size === 0) {
            clients.delete(ws.userId);
          }
        }
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
