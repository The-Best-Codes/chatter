import { Database } from "sqlite3";
import * as bcrypt from "bcryptjs";

const db = new Database("chat.db");

// Initialize database with schema
const schema = await Bun.file(`${import.meta.dir}/schema.sql`).text();
db.exec(schema);

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
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            resolve(null);
          } else {
            reject(err);
          }
          return;
        }
        resolve({
          id: this.lastID,
          username,
          created_at: new Date().toISOString(),
        });
      }
    );
  });
};

export const verifyUser = async (
  username: string,
  password: string
): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve(null);
          return;
        }
        const valid = await bcrypt.compare(password, row.password);
        if (!valid) {
          resolve(null);
          return;
        }
        resolve({
          id: row.id,
          username: row.username,
          created_at: row.created_at,
        });
      }
    );
  });
};

export const createMessage = async (
  userId: number,
  content: string
): Promise<Message> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO messages (user_id, content) VALUES (?, ?)",
      [userId, content],
      function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          id: this.lastID,
          user_id: userId,
          content,
          created_at: new Date().toISOString(),
        });
      }
    );
  });
};

export const getRecentMessages = async (
  limit: number = 50
): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT m.*, u.username 
             FROM messages m 
             JOIN users u ON m.user_id = u.id 
             ORDER BY m.created_at DESC 
             LIMIT ?`,
      [limit],
      (err, rows: Message[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
};
