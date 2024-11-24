import {
  createUser,
  verifyUser,
  createMessage,
  getRecentMessages,
  type User,
} from "./src/db/database";
import { LIMITS, validateInput, escapeHtml } from "./src/constants";
import crypto from "crypto";
import { MediaManager } from "./src/media";

const port = process.env.PORT || 5177;

// Session management (in-memory for simplicity)
const sessions = new Map<string, User>();
const typingUsers = new Set<string>();

// WebSocket connections with their associated users
const wsUsers = new WeakMap<WebSocket, User>();
const connections = new Map<string, any>();

function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function serveFile(filePath: string, type: string): Response {
  const file = Bun.file(`${process.cwd()}/src/views/${filePath}`);
  return new Response(file, {
    headers: { "Content-Type": type },
  });
}

const server: any = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const sessionId = req.headers
      .get("Cookie")
      ?.split(";")
      .find((c) => c.trim().startsWith("sessionId="))
      ?.split("=")[1];

    const user = sessionId ? sessions.get(sessionId) : null;

    // Serve media files
    if (url.pathname.startsWith("/media/")) {
      const filePath = `${process.cwd()}${url.pathname}`;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("Not Found", { status: 404 });
    }

    // Static files
    if (url.pathname.startsWith("/public/")) {
      const filePath = `${process.cwd()}${url.pathname}`;
      const file = Bun.file(filePath);
      return new Response(file);
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      if (!user) {
        return new Response("Unauthorized", { status: 401 });
      }
      const upgraded = server.upgrade(req, { data: { user } });
      return upgraded
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Routes
    switch (url.pathname) {
      case "/":
        if (!user) {
          return new Response("", {
            status: 302,
            headers: { Location: "/login" },
          });
        }
        return serveFile("index.html", "text/html");

      case "/login":
        if (req.method === "POST") {
          try {
            const { username, password } = await req.json();

            const user = await verifyUser(username, password);
            if (user) {
              const sessionId = generateSessionId();
              sessions.set(sessionId, user);
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Set-Cookie": `sessionId=${sessionId}; HttpOnly; Path=/`,
                },
              });
            }
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid username or password",
              }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid request format",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
        return serveFile("login.html", "text/html");

      case "/signup":
        if (req.method === "POST") {
          try {
            const { username, password } = await req.json();

            const user = await createUser(username, password);
            if (user) {
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(
              JSON.stringify({
                success: false,
                error: "Username already exists",
              }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid request format",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
        return serveFile("signup.html", "text/html");

      case "/logout":
        if (sessionId) {
          sessions.delete(sessionId);
        }
        return new Response("", {
          status: 302,
          headers: {
            Location: "/login",
            "Set-Cookie":
              "sessionId=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
          },
        });

      case "/messages":
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const messages = await getRecentMessages();
        return new Response(JSON.stringify(messages), {
          headers: { "Content-Type": "application/json" },
        });

      case "/me":
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        return new Response(
          JSON.stringify({
            username: user.username,
            id: user.id,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

      case "/upload":
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }
        try {
          const formData = await req.formData();
          const image = formData.get("image");

          if (!image || !(image instanceof File)) {
            return new Response("No image provided", { status: 400 });
          }

          const buffer = await image.arrayBuffer();
          const result = await MediaManager.getInstance().processAndSaveImage(
            Buffer.from(buffer),
            image.name
          );

          return new Response(JSON.stringify({ url: result.url }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Upload error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Upload failed",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

      default:
        return new Response("Not Found", { status: 404 });
    }
  },
  websocket: {
    open(ws: any) {
      const user = ws.data.user as User;
      wsUsers.set(ws, user);
      connections.set(user.username, ws);
      ws.subscribe("chat");
    },
    async message(ws: any, message: string) {
      const user = wsUsers.get(ws);
      if (!user) {
        return;
      }

      const data = JSON.parse(message);

      switch (data.type) {
        case "message":
          try {
            // Validate message content
            const validatedContent = validateInput(
              data.content,
              LIMITS.MESSAGE_MAX_LENGTH
            );
            // Escape HTML in the message
            const safeContent = escapeHtml(validatedContent);
            const msg = await createMessage(user.id, safeContent);
            server.publish(
              "chat",
              JSON.stringify({
                type: "message",
                username: user.username,
                content: safeContent,
                timestamp: new Date().toISOString(),
              })
            );
          } catch (error) {
            // Send error back to the client
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

          server.publish(
            "chat",
            JSON.stringify({
              type: "typing",
              message: typingMessage,
            })
          );
          break;
      }
    },
    close(ws: any) {
      const user = wsUsers.get(ws);
      if (user) {
        connections.delete(user.username);
        typingUsers.delete(user.username);
        wsUsers.delete(ws);

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

        server.publish(
          "chat",
          JSON.stringify({
            type: "typing",
            message: typingMessage,
          })
        );
      }
    },
  },
});

console.log(`Chat server running at http://localhost:${port}`);
