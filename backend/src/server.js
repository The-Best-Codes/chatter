import "dotenv/config";

import { createServer } from "http";
import express, { json } from "express";
import { WebSocketServer } from "ws";
import { query } from "./config/db.js";
import { init } from "./services/websocketService.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import userPermissionRoutes from "./routes/userPermissionRoutes.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080;

app.use(json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/user", userPermissionRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is running" });
});

// Initialize our WebSocket service and pass it the server instance
init(wss);

// Server
async function startServer() {
  try {
    await query("SELECT NOW()");
    console.log("🐘 Database connected successfully.");

    server.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("💀 Failed to start server:");
    console.error(error);
    process.exit(1);
  }
}

startServer();
