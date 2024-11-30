import type { Server, ServerWebSocket } from "bun";
import type { User } from "../db/database";
import { createMessage } from "../db/database";
import { LIMITS, validateInput, escapeHtml } from "../constants";
import { setUserStatus, getRecentUserStatuses } from "./status";

const typingUsers = new Set<string>();
const wsUsers = new WeakMap<ServerWebSocket<unknown>, User>();
const connections = new Map<string, ServerWebSocket<unknown>>();

export function createWebSocketHandler() {
  let serverInstance: Server;

  const handler = {
    open(ws: ServerWebSocket<unknown>) {
      const user = (ws as any).data.user as User;
      wsUsers.set(ws, user);
      connections.set(user.username, ws);
      ws.subscribe("chat");
      ws.subscribe("status");

      // First send initial list of online users to the new connection
      getRecentUserStatuses().then((statuses) => {
        ws.send(
          JSON.stringify({
            type: "initial_status",
            users: statuses,
          })
        );

        // Then set user as online and broadcast their status
        setUserStatus(user.id, "online").then(() => {
          serverInstance.publish(
            "status",
            JSON.stringify({
              type: "status_update",
              username: user.username,
              status: "online",
              lastSeen: new Date().toISOString(),
            })
          );
        });
      });
    },

    async message(ws: ServerWebSocket<unknown>, message: string) {
      const user = wsUsers.get(ws);
      if (!user) {
        return;
      }

      const data = JSON.parse(message);

      switch (data.type) {
        case "ping":
          // Update user's last seen time
          await setUserStatus(user.id, "online");
          break;

        case "message":
          try {
            const validatedContent = validateInput(
              data.content,
              LIMITS.MESSAGE_MAX_LENGTH
            );
            const safeContent = escapeHtml(validatedContent);
            const msg = await createMessage(user.id, safeContent);

            serverInstance.publish(
              "chat",
              JSON.stringify({
                type: "message",
                username: user.username,
                content: safeContent,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: (error as Error)?.message || "Failed to send message",
              })
            );
          }
          break;

        case "typing":
          if (data.isTyping) {
            typingUsers.add(user.username);
          } else {
            typingUsers.delete(user.username);
          }

          const typing = Array.from(typingUsers);
          let typingMessage = "";
          if (typing.length === 1) {
            typingMessage = `${typing[0]} is typing...`;
          } else if (typing.length === 2) {
            typingMessage = `${typing[0]} and ${typing[1]} are typing...`;
          } else if (typing.length === 3) {
            typingMessage = `${typing[0]}, ${typing[1]}, and ${typing[2]} are typing...`;
          } else if (typing.length > 3) {
            typingMessage = `${typing[0]}, ${typing[1]}, ${typing[2]}, and ${
              typing.length - 3
            } others are typing...`;
          }

          serverInstance.publish(
            "chat",
            JSON.stringify({
              type: "typing",
              message: typingMessage,
            })
          );
          break;

        case "get_statuses":
          const statuses = await getRecentUserStatuses(data.limit || 50);
          ws.send(
            JSON.stringify({
              type: "status_list",
              statuses,
            })
          );
          break;
      }
    },

    close(ws: ServerWebSocket<unknown>) {
      const user = wsUsers.get(ws);
      if (!user) {
        return;
      }

      // Set user as offline when they disconnect
      setUserStatus(user.id, "offline");

      // Broadcast user's offline status
      serverInstance.publish(
        "status",
        JSON.stringify({
          type: "status_update",
          username: user.username,
          status: "offline",
          lastSeen: new Date().toISOString(),
        })
      );

      connections.delete(user.username);
      wsUsers.delete(ws);
      ws.unsubscribe("chat");
      ws.unsubscribe("status");
    },
  };

  return {
    handler,
    setServer: (server: Server) => {
      serverInstance = server;
    },
  };
}
