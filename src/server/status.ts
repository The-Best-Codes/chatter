import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH || `${process.cwd()}/chat.db`;
const db = new Database(DB_PATH);

export interface UserStatus {
  username: string;
  status: "online" | "offline";
  lastSeen: string;
}

export async function setUserStatus(
  userId: number,
  status: "online" | "offline"
): Promise<void> {
  const stmt = db.prepare(`
    INSERT INTO user_status (user_id, status, last_seen)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      status = excluded.status,
      last_seen = excluded.last_seen
  `);
  stmt.run(userId, status);
}

export async function getUserStatus(
  userId: number
): Promise<UserStatus | null> {
  const stmt = db.prepare(`
    SELECT us.*, u.username
    FROM user_status us
    JOIN users u ON us.user_id = u.id
    WHERE us.user_id = ?
  `);
  const status = stmt.get(userId) as any;

  if (!status) {
    return null;
  }

  return {
    username: status.username,
    status: status.status,
    lastSeen: status.last_seen,
  };
}

export async function getRecentUserStatuses(
  limit: number = 50
): Promise<UserStatus[]> {
  const stmt = db.prepare(`
    SELECT us.*, u.username
    FROM user_status us
    JOIN users u ON us.user_id = u.id
    WHERE us.last_seen >= datetime('now', '-10 minutes') 
      AND us.status = 'online'
    ORDER BY us.last_seen DESC
    LIMIT ?
  `);

  const statuses = stmt.all(limit) as any[];

  return statuses.map((status) => ({
    username: status.username,
    status: status.status,
    lastSeen: status.last_seen,
  }));
}

export async function setAllUsersOffline(): Promise<void> {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_status (user_id, status, last_seen)
    SELECT id, 'offline', datetime('now')
    FROM users
  `);
  stmt.run();
}

// Mark users as offline if they haven't been seen in 10 minutes
setInterval(() => {
  const stmt = db.prepare(`
    UPDATE user_status
    SET status = 'offline'
    WHERE status = 'online'
    AND last_seen < datetime('now', '-10 minutes')
  `);
  stmt.run();
}, 60000); // Check every minute
