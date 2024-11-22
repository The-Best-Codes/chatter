import { Database } from "bun:sqlite";
import * as bcrypt from "bcryptjs";

const DB_PATH = process.env.DB_PATH || `${process.cwd()}/chat.db`;
const SCHEMA_PATH = process.env.SCHEMA_PATH || `${process.cwd()}/src/db/schema.sql`;

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

export const createUser = async (
  username: string,
  password: string
): Promise<User | null> => {
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
