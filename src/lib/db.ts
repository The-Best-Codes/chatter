import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize the database
const db = new Database(path.join(dataDir, 'chatter.db'));

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Create tables if they don't exist
function initializeDatabase() {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login INTEGER,
      is_admin INTEGER DEFAULT 0
    )
  `);

  // User permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id TEXT PRIMARY KEY,
      can_send_attachments INTEGER DEFAULT 1,
      max_message_length INTEGER DEFAULT 2000,
      can_create_public_room INTEGER DEFAULT 1,
      can_create_private_room INTEGER DEFAULT 1,
      can_dm INTEGER DEFAULT 1,
      can_create_invites INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Default permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS default_permissions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      can_send_attachments INTEGER DEFAULT 1,
      max_message_length INTEGER DEFAULT 2000,
      can_create_public_room INTEGER DEFAULT 1,
      can_create_private_room INTEGER DEFAULT 1,
      can_dm INTEGER DEFAULT 1,
      can_create_invites INTEGER DEFAULT 1,
      allow_signups INTEGER DEFAULT 1
    )
  `);

  // Rooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Room members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_members (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      is_admin INTEGER DEFAULT 0,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Direct messages table (for tracking DM conversations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user1_id, user2_id)
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      room_id TEXT,
      dm_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      has_attachment INTEGER DEFAULT 0,
      encrypted_content TEXT,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (dm_id) REFERENCES direct_messages(id) ON DELETE CASCADE,
      CHECK ((room_id IS NULL AND dm_id IS NOT NULL) OR (room_id IS NOT NULL AND dm_id IS NULL))
    )
  `);

  // Attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  // Invites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      dm_user_id TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      max_uses INTEGER DEFAULT 1,
      uses INTEGER DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((room_id IS NULL AND dm_user_id IS NOT NULL) OR (room_id IS NOT NULL AND dm_user_id IS NULL))
    )
  `);

  // Insert default settings if they don't exist
  const defaultPermissionsExist = db.prepare('SELECT 1 FROM default_permissions WHERE id = 1').get();
  if (!defaultPermissionsExist) {
    db.prepare(`
      INSERT INTO default_permissions (
        id, can_send_attachments, max_message_length, can_create_public_room, 
        can_create_private_room, can_dm, can_create_invites, allow_signups
      ) VALUES (1, 1, 2000, 1, 1, 1, 1, 1)
    `).run();
  }

  // Create admin user if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    const adminId = uuidv4();
    const passwordHash = bcrypt.hashSync('admin', 10);
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at, is_admin)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(adminId, 'admin', 'admin@chatter.local', passwordHash, now);
    
    db.prepare(`
      INSERT INTO user_permissions (
        user_id, can_send_attachments, max_message_length, can_create_public_room,
        can_create_private_room, can_dm, can_create_invites
      ) VALUES (?, 1, 5000, 1, 1, 1, 1)
    `).run(adminId);
  }
}

// Initialize the database
initializeDatabase();

// Import and run migrations
import './db-migration';

export { db };