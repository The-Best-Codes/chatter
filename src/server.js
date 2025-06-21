// Load environment variables from .env file
require('dotenv').config();

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const db = require('./config/db');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');

// --- Basic Setup ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes); // Use the auth routes

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// --- WebSocket Server Logic ---
wss.on('connection', (ws) => {
  console.log('✅ Client connected to WebSocket');

  ws.on('message', (message) => {
    console.log('received: %s', message);
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket Error:', error);
  });
});

// --- Start Server ---
async function startServer() {
  try {
    await db.query('SELECT NOW()');
    console.log('🐘 Database connected successfully.');

    server.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
      console.log('📡 WebSocket server is running.');
    });
  } catch (error) {
    console.error('💀 Failed to start server:');
    console.error(error);
    process.exit(1);
  }
}

startServer();
