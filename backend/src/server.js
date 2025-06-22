import { configDotenv } from "dotenv";
configDotenv();

import { createServer } from "http";
import express, { json } from "express";
import { WebSocketServer } from "ws";
import { query } from "./config/db";
import { init } from "./services/websocketService";

// Routes
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import roomRoutes from "./routes/roomRoutes";
import adminRoutes from "./routes/adminRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import messageRoutes from "./routes/messageRoutes";
import sessionRoutes from "./routes/sessionRoutes";

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
