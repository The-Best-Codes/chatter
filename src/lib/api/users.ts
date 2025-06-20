import { db } from '../db';
import { updateUserPermissions } from '../auth';
import type { User, UserPermissions } from '../auth';

// User profile type
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  lastLogin?: number;
  isAdmin: boolean;
  permissions: UserPermissions;
}

// Get user by ID
export function getUserById(userId: string): UserProfile | null {
  try {
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.created_at as createdAt, 
             u.last_login as lastLogin, u.is_admin as isAdmin,
             p.can_send_attachments as canSendAttachments,
             p.max_message_length as maxMessageLength,
             p.can_create_public_room as canCreatePublicRoom,
             p.can_create_private_room as canCreatePrivateRoom,
             p.can_dm as canDM,
             p.can_create_invites as canCreateInvites
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(userId);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isAdmin: Boolean(user.isAdmin),
      permissions: {
        canSendAttachments: Boolean(user.canSendAttachments),
        maxMessageLength: user.maxMessageLength,
        canCreatePublicRoom: Boolean(user.canCreatePublicRoom),
        canCreatePrivateRoom: Boolean(user.canCreatePrivateRoom),
        canDM: Boolean(user.canDM),
        canCreateInvites: Boolean(user.canCreateInvites)
      }
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// Get user by username
export function getUserByUsername(username: string): UserProfile | null {
  try {
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.created_at as createdAt, 
             u.last_login as lastLogin, u.is_admin as isAdmin,
             p.can_send_attachments as canSendAttachments,
             p.max_message_length as maxMessageLength,
             p.can_create_public_room as canCreatePublicRoom,
             p.can_create_private_room as canCreatePrivateRoom,
             p.can_dm as canDM,
             p.can_create_invites as canCreateInvites
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.username = ?
    `).get(username);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isAdmin: Boolean(user.isAdmin),
      permissions: {
        canSendAttachments: Boolean(user.canSendAttachments),
        maxMessageLength: user.maxMessageLength,
        canCreatePublicRoom: Boolean(user.canCreatePublicRoom),
        canCreatePrivateRoom: Boolean(user.canCreatePrivateRoom),
        canDM: Boolean(user.canDM),
        canCreateInvites: Boolean(user.canCreateInvites)
      }
    };
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

// Search users by username
export function searchUsers(query: string, limit: number = 10): Pick<UserProfile, 'id' | 'username'>[] {
  try {
    const users = db.prepare(`
      SELECT id, username
      FROM users
      WHERE username LIKE ?
      LIMIT ?
    `).all(`%${query}%`, limit);
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Get all users (admin only)
export function getAllUsers(limit: number = 50, offset: number = 0): UserProfile[] {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.email, u.created_at as createdAt, 
             u.last_login as lastLogin, u.is_admin as isAdmin,
             p.can_send_attachments as canSendAttachments,
             p.max_message_length as maxMessageLength,
             p.can_create_public_room as canCreatePublicRoom,
             p.can_create_private_room as canCreatePrivateRoom,
             p.can_dm as canDM,
             p.can_create_invites as canCreateInvites
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      ORDER BY u.username
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isAdmin: Boolean(user.isAdmin),
      permissions: {
        canSendAttachments: Boolean(user.canSendAttachments),
        maxMessageLength: user.maxMessageLength,
        canCreatePublicRoom: Boolean(user.canCreatePublicRoom),
        canCreatePrivateRoom: Boolean(user.canCreatePrivateRoom),
        canDM: Boolean(user.canDM),
        canCreateInvites: Boolean(user.canCreateInvites)
      }
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Update user profile
export function updateUserProfile(
  userId: string,
  updates: { username?: string; email?: string }
): boolean {
  try {
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (updates.username !== undefined) {
      // Check if username is already taken
      const existingUser = db.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?')
        .get(updates.username, userId);
      
      if (existingUser) {
        throw new Error('Username already taken');
      }
      
      updateFields.push('username = ?');
      params.push(updates.username);
    }
    
    if (updates.email !== undefined) {
      // Check if email is already taken
      const existingUser = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?')
        .get(updates.email, userId);
      
      if (existingUser) {
        throw new Error('Email already taken');
      }
      
      updateFields.push('email = ?');
      params.push(updates.email);
    }
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    params.push(userId);
    
    db.prepare(`
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}

// Set admin status (admin only)
export function setAdminStatus(userId: string, isAdmin: boolean): boolean {
  try {
    db.prepare(`
      UPDATE users
      SET is_admin = ?
      WHERE id = ?
    `).run(isAdmin ? 1 : 0, userId);
    
    return true;
  } catch (error) {
    console.error('Error setting admin status:', error);
    return false;
  }
}

// Count total users
export function countUsers(): number {
  try {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  } catch (error) {
    console.error('Error counting users:', error);
    return 0;
  }
}