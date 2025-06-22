// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const db = require('./config/db');
const websocketService = require('./services/websocketService');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- Basic Setup ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// --- WebSocket Server Logic ---
// Initialize our WebSocket service and pass it the server instance
websocketService.init(wss);

// --- Start Server ---
async function startServer() {
  try {
    await db.query('SELECT NOW()');
    console.log('🐘 Database connected successfully.');

    server.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('💀 Failed to start server:');
    console.error(error);
    process.exit(1);
  }
}

startServer();
