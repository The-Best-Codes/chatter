// This script initializes the database by creating all necessary tables.
import "dotenv/config";

import { getPool, query } from "../config/db.js";

const createTablesQueries = `
  -- Enable UUID generation
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Main user table
  CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      hashed_password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      public_key_identity TEXT NOT NULL,
      public_key_bundle JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'frozen', 'deleted'
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Active login sessions for a user
  CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address INET,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- For blocking DMs
  CREATE TABLE blocked_users (
      id SERIAL PRIMARY KEY,
      blocker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (blocker_user_id, blocked_user_id)
  );

  -- Represents both the main room and DMs
  CREATE TABLE rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL, -- 'main_chat', 'dm'
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Create the main chat room upon initialization
  INSERT INTO rooms (id, type, name) VALUES ('00000000-0000-0000-0000-000000000001', 'main_chat', 'General');


  -- Junction table for users and rooms
  CREATE TABLE room_members (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      notification_level TEXT NOT NULL DEFAULT 'all', -- 'all', 'mentions_only', 'none'
      UNIQUE (user_id, room_id)
  );

  -- The messages themselves
  CREATE TABLE messages (
      id BIGSERIAL PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id),
      encrypted_content TEXT NOT NULL,
      reply_to_message_id BIGINT REFERENCES messages(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ
  );

  -- For emoji reactions
  CREATE TABLE message_reactions (
      id SERIAL PRIMARY KEY,
      message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji_code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (message_id, user_id, emoji_code)
  );

  -- For pinning messages in a room
  CREATE TABLE pinned_messages (
      id SERIAL PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      pinned_by_user_id UUID NOT NULL REFERENCES users(id),
      pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (room_id, message_id)
  );

  -- A simple key-value store for global settings
  CREATE TABLE app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Insert default settings
  INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('signup_mode', '{"value": "enabled"}'), -- enabled, disabled, invite_only
  ('default_permissions', '{"can_send_attachments": true, "max_attachment_size_kb": 10240, "can_send_messages": true, "can_dm_users": true, "max_message_length": 2000, "can_edit_messages": true, "can_delete_messages": true, "can_react_to_messages": true, "message_rate_limit": 10}');

  -- For per-user permission overrides.
  CREATE TABLE user_permissions (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      can_send_messages BOOLEAN,
      can_dm_users BOOLEAN,
      can_send_attachments BOOLEAN,
      max_attachment_size_kb INT,
      max_message_length INT,
      can_edit_messages BOOLEAN,
      can_delete_messages BOOLEAN,
      can_react_to_messages BOOLEAN,
      message_rate_limit INT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- For invite-only signup mode
  CREATE TABLE invite_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_by_admin_id UUID REFERENCES users(id),
      used_by_user_id UUID UNIQUE REFERENCES users(id),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- For the admin to see what other admins are doing
  CREATE TABLE admin_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id UUID NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_user_id UUID,
      details JSONB,
      ip_address INET,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Notifications table
  CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mention', 'reply', 'new_dm'
    source_message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    source_user_id UUID REFERENCES users(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    is_cleared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Password reset codes table
  CREATE TABLE password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hashed_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id)
  );
`;

const initDb = async () => {
  try {
    console.log("Dropping existing tables...");
    // A simple loop to drop tables in reverse order of creation to respect foreign keys
    const tables = [
      "password_resets",
      "notifications",
      "admin_audit_logs",
      "invite_codes",
      "user_permissions",
      "app_settings",
      "pinned_messages",
      "message_reactions",
      "messages",
      "room_members",
      "rooms",
      "blocked_users",
      "sessions",
      "users",
    ];
    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    console.log("Creating tables...");
    await query(createTablesQueries);
    console.log("✅ Database tables created successfully.");

    // We need to close the pool to allow the script to exit
    const pool = getPool();
    await pool.end();
  } catch (error) {
    console.error("💀 Error initializing database:", error);
    process.exit(1);
  }
};

initDb();
