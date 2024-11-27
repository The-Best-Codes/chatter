import { Database } from "bun:sqlite";
import * as bcrypt from "bcryptjs";
import { LIMITS, validateInput, escapeHtml } from "../constants";

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
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
}

export interface ReadReceipt {
  id: number;
  message_id: number;
  user_id: number;
  created_at: string;
}

export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
}

export const createUser = async (
  username: string,
  password: string
): Promise<User | null> => {
  // Validate input lengths
  username = validateInput(username, LIMITS.USERNAME_MAX_LENGTH);
  password = validateInput(password, LIMITS.PASSWORD_MAX_LENGTH);

  // Escape HTML in username
  username = escapeHtml(username);

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)"
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
  password: string
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
  userId: number,
  content: string
): Promise<Message> => {
  // Validate message length
  content = validateInput(content, LIMITS.MESSAGE_MAX_LENGTH);

  const stmt = db.prepare(
    "INSERT INTO messages (user_id, content) VALUES (?, ?)"
  );
  const result = stmt.run(userId, content);

  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    content,
    created_at: new Date().toISOString(),
  };
};

export const getRecentMessages = async (
  limit: number = 50
): Promise<Message[]> => {
  const stmt = db.prepare(`
    SELECT m.*, u.username 
    FROM messages m 
    JOIN users u ON m.user_id = u.id 
    ORDER BY m.created_at DESC 
    LIMIT ?
  `);
  return stmt.all(limit) as Message[];
};

export const createReadReceipt = async (
  messageId: number,
  userId: number
): Promise<ReadReceipt> => {
  const stmt = db.prepare(
    "INSERT INTO read_receipts (message_id, user_id) VALUES (?, ?)"
  );
  const result = stmt.run(messageId, userId);

  return {
    id: Number(result.lastInsertRowid),
    message_id: messageId,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
};

export const createReaction = async (
  messageId: number,
  userId: number,
  reaction: string
): Promise<Reaction> => {
  const stmt = db.prepare(
    "INSERT INTO reactions (message_id, user_id, reaction) VALUES (?, ?, ?)"
  );
  const result = stmt.run(messageId, userId, reaction);

  return {
    id: Number(result.lastInsertRowid),
    message_id: messageId,
    user_id: userId,
    reaction,
    created_at: new Date().toISOString(),
  };
};

export const editMessage = async (
  messageId: number,
  newContent: string
): Promise<void> => {
  // Validate message length
  newContent = validateInput(newContent, LIMITS.MESSAGE_MAX_LENGTH);

  const stmt = db.prepare(
    "UPDATE messages SET content = ? WHERE id = ?"
  );
  stmt.run(newContent, messageId);
};

export const deleteMessage = async (
  messageId: number
): Promise<void> => {
  const stmt = db.prepare(
    "DELETE FROM messages WHERE id = ?"
  );
  stmt.run(messageId);
};
