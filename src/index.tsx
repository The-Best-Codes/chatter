import { serve } from "bun";
import index from "./index.html";
import { db } from "./lib/db";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  verifyToken,
  getDefaultPermissions,
  updateUserPermissions,
  updateDefaultPermissions,
} from "./lib/auth";
import { cookies } from "./lib/cookies";
import * as api from "./lib/api";
import { runDatabaseMigrations } from "./lib/run-migrations";
import { initWebSocketServer, getWebSocketServer } from "./lib/websocket";

// Run database migrations
runDatabaseMigrations();

const server = serve({
  websocket: {
    // This handler is called when a WebSocket is connected
    open(ws) {
      // Extract user ID from the query parameters
      let userId = '';
      
      try {
        // Try to get from query parameters
        const data = ws.data as any;
        if (data && data.query && data.query.userId) {
          userId = String(data.query.userId);
        }
      } catch (error) {
        console.error('Error extracting userId from WebSocket connection:', error);
      }
      
      if (!userId) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Authentication required' }
        }));
        ws.close();
        return;
      }
      
      // Add the client to our WebSocket server
      const wsServer = getWebSocketServer();
      wsServer.addClient(ws, userId);
    },
    // This handler is called when a WebSocket message is received
    message(ws, message) {
      try {
        // Extract user ID from the data
        const data = ws.data as any;
        const userId = data && data.query && data.query.userId ? String(data.query.userId) : '';
        
        if (!userId) return;
        
        // Parse the message
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        
        // Get the WebSocket server and handle the message
        const wsServer = getWebSocketServer();
        if (wsServer) {
          wsServer.handleClientMessage(userId, parsedMessage);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Invalid message format' }
        }));
      }
    },
    // This handler is called when a WebSocket is closed
    close(ws, code, message) {
      try {
        // Extract user ID from the data
        const data = ws.data as any;
        const userId = data && data.query && data.query.userId ? String(data.query.userId) : '';
        
        if (!userId) return;
        
        // Get the WebSocket server and handle the disconnect
        const wsServer = getWebSocketServer();
        if (wsServer) {
          wsServer.handleClientDisconnect(userId);
        }
      } catch (error) {
        console.error('Error handling WebSocket close:', error);
      }
    }
  },
  fetch(req, server) {
    // Try to upgrade the request to a WebSocket connection
    if (server.upgrade(req)) {
      return; // Return nothing if upgrade successful
    }
    
    // If not a WebSocket upgrade, continue with normal HTTP handling
    return new Response(index, {
      headers: { "Content-Type": "text/html" },
    });
  },
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // Auth routes
    "/api/auth/register": {
      async POST(req) {
        try {
          const { username, email, password } = await req.json();

          if (!username || !email || !password) {
            return Response.json(
              { message: "Missing required fields" },
              { status: 400 },
            );
          }

          const user = await registerUser(username, email, password);

          if (!user) {
            return Response.json(
              { message: "Failed to register user" },
              { status: 400 },
            );
          }

          const token = await loginUser(email, password);

          if (!token) {
            return Response.json(
              { message: "Failed to login after registration" },
              { status: 500 },
            );
          }

          let response = Response.json({
            message: "User registered successfully",
            token,
          });

          // Set auth cookie
          response = cookies.set(response, "auth_token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60, // 24 hours
            path: "/",
          });

          return response;
        } catch (error) {
          console.error("Registration error:", error);
          return Response.json(
            { message: error.message || "Registration failed" },
            { status: 500 },
          );
        }
      },
    },

    "/api/auth/login": {
      async POST(req) {
        try {
          const { usernameOrEmail, password } = await req.json();

          if (!usernameOrEmail || !password) {
            return Response.json(
              { message: "Missing required fields" },
              { status: 400 },
            );
          }

          const token = await loginUser(usernameOrEmail, password);

          if (!token) {
            return Response.json(
              { message: "Invalid credentials" },
              { status: 401 },
            );
          }

          let response = Response.json({
            message: "Login successful",
            token,
          });

          // Set auth cookie
          response = cookies.set(response, "auth_token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60, // 24 hours
            path: "/",
          });

          return response;
        } catch (error) {
          console.error("Login error:", error);
          return Response.json(
            { message: error.message || "Login failed" },
            { status: 500 },
          );
        }
      },
    },

    "/api/auth/logout": {
      async POST(req) {
        let response = Response.json({ message: "Logged out successfully" });

        // Clear auth cookie
        response = cookies.remove(response, "auth_token", { path: "/" });

        return response;
      },
    },

    "/api/auth/me": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          return Response.json(user);
        } catch (error) {
          console.error("Auth error:", error);
          return Response.json(
            { message: error.message || "Authentication failed" },
            { status: 500 },
          );
        }
      },
    },

    // Admin routes
    "/api/admin/users": {
      async GET(req) {
        try {
          // Check if user is admin
          const user = await getCurrentUser(req);

          if (!user || !user.isAdmin) {
            return Response.json({ message: "Unauthorized" }, { status: 403 });
          }

          const search = new URL(req.url).searchParams.get("search");

          let users;
          if (search) {
            users = db
              .prepare(
                `
              SELECT u.id, u.username, u.email, u.created_at as createdAt,
                     u.last_login as lastLogin, u.is_admin as isAdmin
              FROM users u
              WHERE u.username LIKE ? OR u.email LIKE ?
              ORDER BY u.username
              LIMIT 50
            `,
              )
              .all(`%${search}%`, `%${search}%`);
          } else {
            users = db
              .prepare(
                `
              SELECT u.id, u.username, u.email, u.created_at as createdAt,
                     u.last_login as lastLogin, u.is_admin as isAdmin
              FROM users u
              ORDER BY u.username
              LIMIT 50
            `,
              )
              .all();
          }

          // Get permissions for each user
          const usersWithPermissions = users.map((user) => {
            const permissions =
              db
                .prepare(
                  `
              SELECT can_send_attachments as canSendAttachments,
                     max_message_length as maxMessageLength,
                     can_create_public_room as canCreatePublicRoom,
                     can_create_private_room as canCreatePrivateRoom,
                     can_dm as canDM,
                     can_create_invites as canCreateInvites
              FROM user_permissions
              WHERE user_id = ?
            `,
                )
                .get(user.id) || {};

            return {
              ...user,
              isAdmin: Boolean(user.isAdmin),
              permissions: {
                canSendAttachments: Boolean(
                  (permissions as any).canSendAttachments,
                ),
                maxMessageLength: (permissions as any).maxMessageLength || 2000,
                canCreatePublicRoom: Boolean(
                  (permissions as any).canCreatePublicRoom,
                ),
                canCreatePrivateRoom: Boolean(
                  (permissions as any).canCreatePrivateRoom,
                ),
                canDM: Boolean((permissions as any).canDM),
                canCreateInvites: Boolean(
                  (permissions as any).canCreateInvites,
                ),
              },
            };
          });

          return Response.json(usersWithPermissions);
        } catch (error) {
          console.error("Admin users error:", error);
          return Response.json(
            { message: error.message || "Failed to get users" },
            { status: 500 },
          );
        }
      },
    },

    "/api/admin/users/:userId/admin-status": {
      async PUT(req) {
        try {
          // Check if user is admin
          const currentUser = await getCurrentUser(req);

          if (!currentUser || !currentUser.isAdmin) {
            return Response.json({ message: "Unauthorized" }, { status: 403 });
          }

          const { userId } = req.params;
          const { isAdmin } = await req.json();

          db.prepare(
            `
            UPDATE users
            SET is_admin = ?
            WHERE id = ?
          `,
          ).run(isAdmin ? 1 : 0, userId);

          return Response.json({
            message: "Admin status updated successfully",
          });
        } catch (error) {
          console.error("Admin status update error:", error);
          return Response.json(
            { message: error.message || "Failed to update admin status" },
            { status: 500 },
          );
        }
      },
    },

    "/api/admin/users/:userId/permissions": {
      async PUT(req) {
        try {
          // Check if user is admin
          const currentUser = await getCurrentUser(req);

          if (!currentUser || !currentUser.isAdmin) {
            return Response.json({ message: "Unauthorized" }, { status: 403 });
          }

          const { userId } = req.params;
          const permissions = await req.json();

          const success = updateUserPermissions(userId, permissions);

          if (!success) {
            return Response.json(
              { message: "Failed to update permissions" },
              { status: 500 },
            );
          }

          return Response.json({ message: "Permissions updated successfully" });
        } catch (error) {
          console.error("Permissions update error:", error);
          return Response.json(
            { message: error.message || "Failed to update permissions" },
            { status: 500 },
          );
        }
      },
    },

    "/api/admin/default-permissions": {
      async GET(req) {
        try {
          // Check if user is admin
          const currentUser = await getCurrentUser(req);

          if (!currentUser || !currentUser.isAdmin) {
            return Response.json({ message: "Unauthorized" }, { status: 403 });
          }

          const defaultPermissions = getDefaultPermissions();

          return Response.json(defaultPermissions);
        } catch (error) {
          console.error("Default permissions error:", error);
          return Response.json(
            { message: error.message || "Failed to get default permissions" },
            { status: 500 },
          );
        }
      },

      async PUT(req) {
        try {
          // Check if user is admin
          const currentUser = await getCurrentUser(req);

          if (!currentUser || !currentUser.isAdmin) {
            return Response.json({ message: "Unauthorized" }, { status: 403 });
          }

          const permissions = await req.json();

          const success = updateDefaultPermissions(permissions);

          if (!success) {
            return Response.json(
              { message: "Failed to update default permissions" },
              { status: 500 },
            );
          }

          return Response.json({
            message: "Default permissions updated successfully",
          });
        } catch (error) {
          console.error("Default permissions update error:", error);
          return Response.json(
            {
              message: error.message || "Failed to update default permissions",
            },
            { status: 500 },
          );
        }
      },
    },
    // Room routes
    "/api/rooms": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const rooms = db
            .prepare(
              `
            SELECT r.id, r.name, r.description, r.is_public as isPublic,
                   r.created_at as createdAt, r.created_by as createdBy,
                   COUNT(rm2.user_id) as memberCount
            FROM rooms r
            JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = ?
            LEFT JOIN room_members rm2 ON r.id = rm2.room_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
          `,
            )
            .all(user.id);

          return Response.json(rooms);
        } catch (error) {
          console.error("Rooms error:", error);
          return Response.json(
            { message: error.message || "Failed to get rooms" },
            { status: 500 },
          );
        }
      },

      async POST(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          // Check permissions
          if (!user.permissions) {
            return Response.json(
              { message: "User permissions not found" },
              { status: 500 },
            );
          }

          const { name, description, isPublic } = await req.json();

          if (!name) {
            return Response.json(
              { message: "Room name is required" },
              { status: 400 },
            );
          }

          // Check if user can create this type of room
          if (isPublic && !user.permissions.canCreatePublicRoom) {
            return Response.json(
              { message: "You don't have permission to create public rooms" },
              { status: 403 },
            );
          }

          if (!isPublic && !user.permissions.canCreatePrivateRoom) {
            return Response.json(
              { message: "You don't have permission to create private rooms" },
              { status: 403 },
            );
          }

          // Import the function from the API
          const { createRoom } = await import("./lib/api/rooms");

          const room = createRoom(name, description, isPublic, user);

          if (!room) {
            return Response.json(
              { message: "Failed to create room" },
              { status: 500 },
            );
          }

          return Response.json(room);
        } catch (error) {
          console.error("Room creation error:", error);
          return Response.json(
            { message: error.message || "Failed to create room" },
            { status: 500 },
          );
        }
      },
    },

    "/api/rooms/public": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          // Import the function from the API
          const { getPublicRooms } = await import("./lib/api/rooms");

          const rooms = getPublicRooms();

          return Response.json(rooms);
        } catch (error) {
          console.error("Public rooms error:", error);
          return Response.json(
            { message: error.message || "Failed to get public rooms" },
            { status: 500 },
          );
        }
      },
    },

    "/api/rooms/:roomId": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { roomId } = req.params;

          // Import the function from the API
          const { getRoomById } = await import("./lib/api/rooms");

          const room = getRoomById(roomId);

          if (!room) {
            return Response.json(
              { message: "Room not found" },
              { status: 404 },
            );
          }

          // Check if user is a member of the room
          const isMember = db
            .prepare(
              `
            SELECT 1 FROM room_members
            WHERE room_id = ? AND user_id = ?
          `,
            )
            .get(roomId, user.id);

          if (!isMember && !room.isPublic) {
            return Response.json(
              { message: "You are not a member of this room" },
              { status: 403 },
            );
          }

          return Response.json(room);
        } catch (error) {
          console.error("Room details error:", error);
          return Response.json(
            { message: error.message || "Failed to get room details" },
            { status: 500 },
          );
        }
      },
    },

    "/api/rooms/:roomId/join": {
      async POST(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { roomId } = req.params;

          // Import the function from the API
          const { joinRoom } = await import("./lib/api/rooms");

          const success = joinRoom(roomId, user.id);

          if (!success) {
            return Response.json(
              { message: "Failed to join room" },
              { status: 500 },
            );
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error("Join room error:", error);
          return Response.json(
            { message: error.message || "Failed to join room" },
            { status: 500 },
          );
        }
      },
    },

    "/api/rooms/:roomId/messages": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { roomId } = req.params;
          const url = new URL(req.url);
          const before = url.searchParams.get("before");
          const after = url.searchParams.get("after");
          const limit = parseInt(url.searchParams.get("limit") || "50");

          // Check if user is a member of the room
          const isMember = db
            .prepare(
              `
            SELECT 1 FROM room_members
            WHERE room_id = ? AND user_id = ?
          `,
            )
            .get(roomId, user.id);

          if (!isMember) {
            return Response.json(
              { message: "You are not a member of this room" },
              { status: 403 },
            );
          }

          // Import the function from the API
          const { getRoomMessages } = await import("./lib/api/room-messages");

          let messages;
          if (before) {
            messages = getRoomMessages(roomId, limit, parseInt(before));
          } else if (after) {
            // This would need a custom function to get messages after a timestamp
            messages = []; // Placeholder
          } else {
            messages = getRoomMessages(roomId, limit);
          }

          return Response.json(messages);
        } catch (error) {
          console.error("Room messages error:", error);
          return Response.json(
            { message: error.message || "Failed to get room messages" },
            { status: 500 },
          );
        }
      },

      async POST(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { roomId } = req.params;

          // Check if user is a member of the room
          const isMember = db
            .prepare(
              `
            SELECT 1 FROM room_members
            WHERE room_id = ? AND user_id = ?
          `,
            )
            .get(roomId, user.id);

          if (!isMember) {
            return Response.json(
              { message: "You are not a member of this room" },
              { status: 403 },
            );
          }

          // Handle form data for attachments
          const formData = await req.formData();
          const content = formData.get("content") as string;
          const attachment = formData.get("attachment") as File | null;

          if (!content && !attachment) {
            return Response.json(
              { message: "Message content is required" },
              { status: 400 },
            );
          }

          // Check message length
          if (
            content &&
            user.permissions &&
            content.length > user.permissions.maxMessageLength
          ) {
            return Response.json(
              {
                message: `Message exceeds maximum length of ${user.permissions.maxMessageLength} characters`,
              },
              { status: 400 },
            );
          }

          // Import the functions from the API
          const { sendRoomMessage } = await import("./lib/api/room-messages");

          // Send the message
          const message = sendRoomMessage(content || "", user.id, roomId);

          if (!message) {
            return Response.json(
              { message: "Failed to send message" },
              { status: 500 },
            );
          }

          // Handle attachment if present
          if (attachment && user.permissions?.canSendAttachments) {
            const { saveAttachment } = await import("./lib/api/attachments");
            await saveAttachment(attachment, message.id, user);
          }

          return Response.json(message);
        } catch (error) {
          console.error("Send message error:", error);
          return Response.json(
            { message: error.message || "Failed to send message" },
            { status: 500 },
          );
        }
      },
    },

    // Direct message routes
    "/api/dm": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          // Import the function from the API
          const { getDMConversationsForUser } = await import(
            "./lib/api/direct-messages"
          );

          const conversations = getDMConversationsForUser(user.id);

          return Response.json(conversations);
        } catch (error) {
          console.error("DM conversations error:", error);
          return Response.json(
            { message: error.message || "Failed to get DM conversations" },
            { status: 500 },
          );
        }
      },

      async POST(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          // Check permissions
          if (!user.permissions?.canDM) {
            return Response.json(
              { message: "You don't have permission to send direct messages" },
              { status: 403 },
            );
          }

          const { userId } = await req.json();

          if (!userId) {
            return Response.json(
              { message: "User ID is required" },
              { status: 400 },
            );
          }

          // Import the function from the API
          const { getOrCreateDMConversation } = await import(
            "./lib/api/direct-messages"
          );

          const conversation = getOrCreateDMConversation(user.id, userId);

          if (!conversation) {
            return Response.json(
              { message: "Failed to create DM conversation" },
              { status: 500 },
            );
          }

          // Add username for convenience
          const otherUser = db
            .prepare(`SELECT username FROM users WHERE id = ?`)
            .get(
              conversation.user1Id === user.id
                ? conversation.user2Id
                : conversation.user1Id,
            );

          return Response.json({
            ...conversation,
            otherUsername: (otherUser as any)?.username,
          });
        } catch (error) {
          console.error("DM creation error:", error);
          return Response.json(
            { message: error.message || "Failed to create DM conversation" },
            { status: 500 },
          );
        }
      },
    },

    "/api/dm/:dmId": {
      async GET(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { dmId } = req.params;

          // Import the function from the API
          const { getDMConversation, isUserInDMConversation } = await import(
            "./lib/api/direct-messages"
          );

          // Check if user is part of the conversation
          if (!isUserInDMConversation(dmId, user.id)) {
            return Response.json(
              { message: "You are not part of this conversation" },
              { status: 403 },
            );
          }

          const conversation = getDMConversation(dmId);

          if (!conversation) {
            return Response.json(
              { message: "Conversation not found" },
              { status: 404 },
            );
          }

          // Add username for convenience
          const otherUser = db
            .prepare(`SELECT username FROM users WHERE id = ?`)
            .get(
              conversation.user1Id === user.id
                ? conversation.user2Id
                : conversation.user1Id,
            );

          return Response.json({
            ...conversation,
            otherUsername: (otherUser as any)?.username,
          });
        } catch (error) {
          console.error("DM details error:", error);
          return Response.json(
            { message: error.message || "Failed to get DM details" },
            { status: 500 },
          );
        }
      },
    },

    // Invite routes
    "/api/invites/:inviteId": {
      async GET(req) {
        try {
          const { inviteId } = req.params;

          // Import the function from the API
          const { getInviteById } = await import("./lib/api/invites");

          const invite = getInviteById(inviteId);

          if (!invite) {
            return Response.json(
              { message: "Invite not found or expired" },
              { status: 404 },
            );
          }

          return Response.json(invite);
        } catch (error) {
          console.error("Invite details error:", error);
          return Response.json(
            { message: error.message || "Failed to get invite details" },
            { status: 500 },
          );
        }
      },
    },

    "/api/invites/:inviteId/accept": {
      async POST(req) {
        try {
          const user = await getCurrentUser(req);

          if (!user) {
            return Response.json(
              { message: "Not authenticated" },
              { status: 401 },
            );
          }

          const { inviteId } = req.params;

          // Import the function from the API
          const { useInvite } = await import("./lib/api/invites");

          const result = useInvite(inviteId, user.id);

          if (!result.success) {
            return Response.json(
              { message: "Failed to use invite" },
              { status: 400 },
            );
          }

          return Response.json(result);
        } catch (error) {
          console.error("Accept invite error:", error);
          return Response.json(
            { message: error.message || "Failed to accept invite" },
            { status: 500 },
          );
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

// Initialize WebSocket server
initWebSocketServer(server);

console.log(`🚀 Server running at ${server.url}`);
