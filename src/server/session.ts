import { Database } from "bun:sqlite";
import crypto from "crypto";
import type { User } from "../db/database";

const DB_PATH = process.env.DB_PATH || `${process.cwd()}/chat.db`;
const SESSION_EXPIRY_HOURS = 24 * 7 * 13; // 13 weeks (~ 3 months)
const db = new Database(DB_PATH);

// TODO: Encryption key should be stored securely in production
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  "525366de48672be221b10f2d3ca9fe00c386ddf655583cba12df05461fe48e1d";
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  // TODO: Fix this
  // @ts-ignore
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  // TODO: Fix this
  // @ts-ignore
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function createSession(user: User): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

  const sessionData = encrypt(
    JSON.stringify({
      userId: user.id,
      username: user.username,
    })
  );

  const stmt = db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, data) VALUES (?, ?, ?, ?)"
  );
  stmt.run(sessionId, user.id, expiresAt.toISOString(), sessionData);

  return sessionId;
}

export async function getSession(sessionId: string): Promise<User | null> {
  const stmt = db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  );
  const session = stmt.get(sessionId) as any;

  if (!session) {
    return null;
  }

  try {
    const decryptedData = decrypt(session.data);
    const userData = JSON.parse(decryptedData);
    return {
      id: userData.userId,
      username: userData.username,
      created_at: session.created_at,
    };
  } catch (error) {
    console.error("Failed to decrypt session data:", error);
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(sessionId);
}

// Cleanup expired sessions periodically
setInterval(() => {
  const stmt = db.prepare(
    "DELETE FROM sessions WHERE expires_at <= datetime('now')"
  );
  stmt.run();
}, 1000 * 60 * 60); // Run every hour
