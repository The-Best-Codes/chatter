import * as bcrypt from "bcryptjs";
import { Database } from "bun:sqlite";
import { escapeHtml, LIMITS, validateInput } from "../constants";

const DB_PATH = process.env.DB_PATH || `${process.cwd()}/chat.db`;
const SCHEMA_PATH =
  process.env.SCHEMA_PATH || `${process.cwd()}/src/db/schema.sql`;

// Create database with proper path
const db = new Database(DB_PATH);

// Initialize database with schema
try {
  const schema = await Bun.file(SCHEMA_PATH).text();
  db.run(schema);
} catch (err) {
  console.error("Failed to initialize database schema:", err);
  throw err;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Message {
  id: number;
  user_id?: number;
  content: string;
  created_at: string;
  username?: string;
  is_bot?: boolean;
  bot_name?: string;
}

export const createUser = async (
  username: string,
  password: string,
): Promise<User | null> => {
  // Validate input lengths
  username = validateInput(username, LIMITS.USERNAME_MAX_LENGTH);
  password = validateInput(password, LIMITS.PASSWORD_MAX_LENGTH);

  // Escape HTML in username
  username = escapeHtml(username);

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)",
    );
    const result = stmt.run(username, hashedPassword);

    if (result.lastInsertRowid) {
      return {
        id: Number(result.lastInsertRowid),
        username,
        created_at: new Date().toISOString(),
      };
    }
    return null;
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return null;
    }
    throw err;
  }
};

export const verifyUser = async (
  username: string,
  password: string,
): Promise<User | null> => {
  // Validate input lengths
  username = validateInput(username, LIMITS.USERNAME_MAX_LENGTH);
  password = validateInput(password, LIMITS.PASSWORD_MAX_LENGTH);

  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  const row = stmt.get(username) as any;

  if (!row) {
    return null;
  }

  const valid = await bcrypt.compare(password, row.password);
  if (!valid) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    created_at: row.created_at,
  };
};

export const createMessage = async (
  content: string,
  options: {
    userId?: number;
    isBot?: boolean;
    botName?: string;
    timestamp?: string;
  },
): Promise<Message> => {
  // Validate message length
  content = validateInput(content, LIMITS.MESSAGE_MAX_LENGTH);

  const stmt = db.prepare(
    "INSERT INTO messages (user_id, content, is_bot, bot_name, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const result = stmt.run(
    options.userId || null,
    content,
    options.isBot || false,
    options.botName || null,
    options.timestamp || new Date().toISOString(),
  );

  return {
    id: Number(result.lastInsertRowid),
    user_id: options.userId,
    content,
    created_at: options.timestamp || new Date().toISOString(),
    is_bot: options.isBot,
    bot_name: options.botName,
  };
};

export const getRecentMessages = async (
  limit: number = 50,
): Promise<Message[]> => {
  const stmt = db.prepare(`
    SELECT m.*, u.username
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `);
  const messages = stmt.all(limit) as Message[];

  // For bot messages, use bot_name as username
  return messages.map((msg) => ({
    ...msg,
    username: msg.is_bot ? msg.bot_name : msg.username,
  }));
};
