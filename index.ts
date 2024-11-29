import dotenv from "dotenv";
dotenv.config();

import { getSession } from "./src/server/session";
import { handleRequest } from "./src/server/routes";
import { createWebSocketHandler } from "./src/server/websocket";

const port = process.env.PORT || 5177;
const wsHandler = createWebSocketHandler();

const server: any = Bun.serve({
  port,
  async fetch(req) {
    const sessionId = req.headers
      .get("Cookie")
      ?.split(";")
      .find((c) => c.trim().startsWith("sessionId="))
      ?.split("=")[1];

    const user = sessionId ? await getSession(sessionId) : null;
    return handleRequest(req, server, user);
  },
  websocket: wsHandler.handler,
});

wsHandler.setServer(server);

console.log(`Chat server running at http://localhost:${port}`);
