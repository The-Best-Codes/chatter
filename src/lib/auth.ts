import { db } from './db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';
import { cookies } from './cookies';

// Secret key for JWT signing
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chatter_secret_key_please_change_in_production'
);

// JWT expiration time (24 hours)
const JWT_EXPIRATION = '24h';

// User type definition
export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  permissions?: UserPermissions;
}

// User permissions type
export interface UserPermissions {
  canSendAttachments: boolean;
  maxMessageLength: number;
  canCreatePublicRoom: boolean;
  canCreatePrivateRoom: boolean;
  canDM: boolean;
  canCreateInvites: boolean;
}

// Default permissions type
export interface DefaultPermissions extends UserPermissions {
  allowSignups: boolean;
}

// Register a new user
export async function registerUser(username: string, email: string, password: string): Promise<User | null> {
  try {
    // Check if signups are allowed
    const defaultPermissions = getDefaultPermissions();
    if (!defaultPermissions.allowSignups) {
      throw new Error('New user registration is currently disabled');
    }

    // Check if username or email already exists
    const existingUser = db.prepare('SELECT 1 FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate user ID
    const userId = uuidv4();
    const now = Date.now();
    
    // Begin transaction
    const transaction = db.transaction(() => {
      // Insert user
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, username, email, passwordHash, now);
      
      // Insert user permissions (use default values)
      db.prepare(`
        INSERT INTO user_permissions (user_id)
        VALUES (?)
      `).run(userId);
    });
    
    // Execute transaction
    transaction();
    
    // Return user object
    return {
      id: userId,
      username,
      email,
      isAdmin: false,
      permissions: getUserPermissions(userId)
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return null;
  }
}

// Login a user
export async function loginUser(usernameOrEmail: string, password: string): Promise<string | null> {
  try {
    // Find user by username or email
    const user = db.prepare(`
      SELECT id, username, email, password_hash, is_admin
      FROM users
      WHERE username = ? OR email = ?
    `).get(usernameOrEmail, usernameOrEmail) as { 
      id: string; 
      username: string; 
      email: string; 
      password_hash: string; 
      is_admin: number;
    } | undefined;
    
    if (!user) {
      return null;
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return null;
    }
    
    // Update last login time
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id);
    
    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: Boolean(user.is_admin)
    });
    
    return token;
  } catch (error) {
    console.error('Error logging in user:', error);
    return null;
  }
}

// Generate JWT token
async function generateToken(user: User): Promise<string> {
  const jwt = await new jose.SignJWT({ 
    sub: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
  
  return jwt;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload.sub || !payload.username || !payload.email) {
      return null;
    }
    
    return {
      id: payload.sub,
      username: payload.username as string,
      email: payload.email as string,
      isAdmin: Boolean(payload.isAdmin),
      permissions: getUserPermissions(payload.sub)
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Get current user from request
export async function getCurrentUser(req: Request): Promise<User | null> {
  try {
    const token = cookies.get(req, 'auth_token');
    if (!token) {
      return null;
    }
    
    return await verifyToken(token);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Get user permissions
export function getUserPermissions(userId: string): UserPermissions {
  const permissions = db.prepare(`
    SELECT can_send_attachments, max_message_length, can_create_public_room,
           can_create_private_room, can_dm, can_create_invites
    FROM user_permissions
    WHERE user_id = ?
  `).get(userId) as {
    can_send_attachments: number;
    max_message_length: number;
    can_create_public_room: number;
    can_create_private_room: number;
    can_dm: number;
    can_create_invites: number;
  } | undefined;
  
  if (!permissions) {
    // Return default permissions if user permissions not found
    const defaults = getDefaultPermissions();
    return {
      canSendAttachments: defaults.canSendAttachments,
      maxMessageLength: defaults.maxMessageLength,
      canCreatePublicRoom: defaults.canCreatePublicRoom,
      canCreatePrivateRoom: defaults.canCreatePrivateRoom,
      canDM: defaults.canDM,
      canCreateInvites: defaults.canCreateInvites
    };
  }
  
  return {
    canSendAttachments: Boolean(permissions.can_send_attachments),
    maxMessageLength: permissions.max_message_length,
    canCreatePublicRoom: Boolean(permissions.can_create_public_room),
    canCreatePrivateRoom: Boolean(permissions.can_create_private_room),
    canDM: Boolean(permissions.can_dm),
    canCreateInvites: Boolean(permissions.can_create_invites)
  };
}

// Get default permissions
export function getDefaultPermissions(): DefaultPermissions {
  const defaults = db.prepare('SELECT * FROM default_permissions WHERE id = 1').get() as {
    can_send_attachments: number;
    max_message_length: number;
    can_create_public_room: number;
    can_create_private_room: number;
    can_dm: number;
    can_create_invites: number;
    allow_signups: number;
  } | undefined;
  
  if (!defaults) {
    // This should never happen as we initialize the defaults in db.ts
    throw new Error('Default permissions not found');
  }
  
  return {
    canSendAttachments: Boolean(defaults.can_send_attachments),
    maxMessageLength: defaults.max_message_length,
    canCreatePublicRoom: Boolean(defaults.can_create_public_room),
    canCreatePrivateRoom: Boolean(defaults.can_create_private_room),
    canDM: Boolean(defaults.can_dm),
    canCreateInvites: Boolean(defaults.can_create_invites),
    allowSignups: Boolean(defaults.allow_signups)
  };
}

// Update user permissions
export function updateUserPermissions(userId: string, permissions: Partial<UserPermissions>): boolean {
  try {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (permissions.canSendAttachments !== undefined) {
      updates.push('can_send_attachments = ?');
      params.push(permissions.canSendAttachments ? 1 : 0);
    }
    
    if (permissions.maxMessageLength !== undefined) {
      updates.push('max_message_length = ?');
      params.push(permissions.maxMessageLength);
    }
    
    if (permissions.canCreatePublicRoom !== undefined) {
      updates.push('can_create_public_room = ?');
      params.push(permissions.canCreatePublicRoom ? 1 : 0);
    }
    
    if (permissions.canCreatePrivateRoom !== undefined) {
      updates.push('can_create_private_room = ?');
      params.push(permissions.canCreatePrivateRoom ? 1 : 0);
    }
    
    if (permissions.canDM !== undefined) {
      updates.push('can_dm = ?');
      params.push(permissions.canDM ? 1 : 0);
    }
    
    if (permissions.canCreateInvites !== undefined) {
      updates.push('can_create_invites = ?');
      params.push(permissions.canCreateInvites ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return true; // Nothing to update
    }
    
    params.push(userId);
    
    db.prepare(`
      UPDATE user_permissions
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `).run(...params);
    
    return true;
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return false;
  }
}

// Update default permissions
export function updateDefaultPermissions(permissions: Partial<DefaultPermissions>): boolean {
  try {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (permissions.canSendAttachments !== undefined) {
      updates.push('can_send_attachments = ?');
      params.push(permissions.canSendAttachments ? 1 : 0);
    }
    
    if (permissions.maxMessageLength !== undefined) {
      updates.push('max_message_length = ?');
      params.push(permissions.maxMessageLength);
    }
    
    if (permissions.canCreatePublicRoom !== undefined) {
      updates.push('can_create_public_room = ?');
      params.push(permissions.canCreatePublicRoom ? 1 : 0);
    }
    
    if (permissions.canCreatePrivateRoom !== undefined) {
      updates.push('can_create_private_room = ?');
      params.push(permissions.canCreatePrivateRoom ? 1 : 0);
    }
    
    if (permissions.canDM !== undefined) {
      updates.push('can_dm = ?');
      params.push(permissions.canDM ? 1 : 0);
    }
    
    if (permissions.canCreateInvites !== undefined) {
      updates.push('can_create_invites = ?');
      params.push(permissions.canCreateInvites ? 1 : 0);
    }
    
    if (permissions.allowSignups !== undefined) {
      updates.push('allow_signups = ?');
      params.push(permissions.allowSignups ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return true; // Nothing to update
    }
    
    db.prepare(`
      UPDATE default_permissions
      SET ${updates.join(', ')}
      WHERE id = 1
    `).run(...params);
    
    return true;
  } catch (error) {
    console.error('Error updating default permissions:', error);
    return false;
  }
}