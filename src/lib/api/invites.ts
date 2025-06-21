import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../auth';
import type { Room } from './rooms';

// Invite type definition
export interface Invite {
  id: string;
  roomId?: string;
  dmUserId?: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses: number;
  uses: number;
  roomName?: string;
  dmUsername?: string;
}

// Create a room invite
export function createRoomInvite(
  roomId: string,
  createdBy: User,
  maxUses: number = 1,
  expiresInHours?: number
): Invite | null {
  try {
    // Check if user is a member of the room
    const isMember = db.prepare(`
      SELECT 1 FROM room_members
      WHERE room_id = ? AND user_id = ?
    `).get(roomId, createdBy.id);
    
    if (!isMember) {
      throw new Error('User is not a member of this room');
    }
    
    // Check if user has permission to create invites
    if (!createdBy.permissions?.canCreateInvites) {
      throw new Error('User does not have permission to create invites');
    }
    
    const inviteId = uuidv4();
    const now = Date.now();
    const expiresAt = expiresInHours ? now + (expiresInHours * 60 * 60 * 1000) : null;
    
    db.prepare(`
      INSERT INTO invites (id, room_id, created_by, created_at, expires_at, max_uses, uses)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(inviteId, roomId, createdBy.id, now, expiresAt, maxUses);
    
    // Get room name for convenience
    const room = db.prepare('SELECT name FROM rooms WHERE id = ?').get(roomId) as { name: string } | undefined;
    
    return {
      id: inviteId,
      roomId,
      createdBy: createdBy.id,
      createdAt: now,
      expiresAt: expiresAt || undefined,
      maxUses,
      uses: 0,
      roomName: room?.name
    };
  } catch (error) {
    console.error('Error creating room invite:', error);
    return null;
  }
}

// Create a DM invite
export function createDMInvite(
  createdBy: User,
  maxUses: number = 1,
  expiresInHours?: number
): Invite | null {
  try {
    // Check if user has permission to create invites and DM
    if (!createdBy.permissions?.canCreateInvites || !createdBy.permissions?.canDM) {
      throw new Error('User does not have permission to create DM invites');
    }
    
    const inviteId = uuidv4();
    const now = Date.now();
    const expiresAt = expiresInHours ? now + (expiresInHours * 60 * 60 * 1000) : null;
    
    db.prepare(`
      INSERT INTO invites (id, dm_user_id, created_by, created_at, expires_at, max_uses, uses)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(inviteId, createdBy.id, createdBy.id, now, expiresAt, maxUses);
    
    return {
      id: inviteId,
      dmUserId: createdBy.id,
      createdBy: createdBy.id,
      createdAt: now,
      expiresAt: expiresAt || undefined,
      maxUses,
      uses: 0,
      dmUsername: createdBy.username
    };
  } catch (error) {
    console.error('Error creating DM invite:', error);
    return null;
  }
}

// Get invite by ID
export function getInviteById(inviteId: string): Invite | null {
  try {
    const invite = db.prepare(`
      SELECT i.id, i.room_id as roomId, i.dm_user_id as dmUserId, 
             i.created_by as createdBy, i.created_at as createdAt,
             i.expires_at as expiresAt, i.max_uses as maxUses, i.uses,
             r.name as roomName, u.username as dmUsername
      FROM invites i
      LEFT JOIN rooms r ON i.room_id = r.id
      LEFT JOIN users u ON i.dm_user_id = u.id
      WHERE i.id = ?
    `).get(inviteId);
    
    if (!invite) {
      return null;
    }
    
    // Cast invite to proper type
    const typedInvite = invite as unknown as Invite;
    
    // Check if invite is expired
    if (typedInvite.expiresAt && typedInvite.expiresAt < Date.now()) {
      return null;
    }
    
    // Check if invite has reached max uses
    if (typedInvite.uses >= typedInvite.maxUses) {
      return null;
    }
    
    return typedInvite;
  } catch (error) {
    console.error('Error getting invite:', error);
    return null;
  }
}

// Use an invite
export function useInvite(inviteId: string, userId: string): { success: boolean; roomId?: string; dmUserId?: string } {
  try {
    const invite = getInviteById(inviteId);
    
    if (!invite) {
      return { success: false };
    }
    
    // Begin transaction
    const transaction = db.transaction(() => {
      // Increment uses
      db.prepare(`
        UPDATE invites
        SET uses = uses + 1
        WHERE id = ?
      `).run(inviteId);
      
      // Handle room invite
      if (invite.roomId) {
        // Check if user is already in the room
        const isMember = db.prepare(`
          SELECT 1 FROM room_members
          WHERE room_id = ? AND user_id = ?
        `).get(invite.roomId, userId);
        
        if (!isMember) {
          // Add user to room
          db.prepare(`
            INSERT INTO room_members (room_id, user_id, joined_at, is_admin)
            VALUES (?, ?, ?, 0)
          `).run(invite.roomId, userId, Date.now());
        }
      }
    });
    
    // Execute transaction
    transaction();
    
    return {
      success: true,
      roomId: invite.roomId,
      dmUserId: invite.dmUserId
    };
  } catch (error) {
    console.error('Error using invite:', error);
    return { success: false };
  }
}

// Get invites created by a user
export function getInvitesCreatedByUser(userId: string): Invite[] {
  try {
    const invites = db.prepare(`
      SELECT i.id, i.room_id as roomId, i.dm_user_id as dmUserId, 
             i.created_by as createdBy, i.created_at as createdAt,
             i.expires_at as expiresAt, i.max_uses as maxUses, i.uses,
             r.name as roomName, u.username as dmUsername
      FROM invites i
      LEFT JOIN rooms r ON i.room_id = r.id
      LEFT JOIN users u ON i.dm_user_id = u.id
      WHERE i.created_by = ?
      ORDER BY i.created_at DESC
    `).all(userId);
    
    return invites as Invite[];
  } catch (error) {
    console.error('Error getting invites created by user:', error);
    return [];
  }
}

// Delete an invite
export function deleteInvite(inviteId: string, userId: string, isAdmin: boolean = false): boolean {
  try {
    // Check if user created the invite or is an admin
    if (!isAdmin) {
      const invite = db.prepare(`
        SELECT created_by FROM invites
        WHERE id = ?
      `).get(inviteId) as { created_by: string } | undefined;
      
      if (!invite || invite.created_by !== userId) {
        return false;
      }
    }
    
    db.prepare(`DELETE FROM invites WHERE id = ?`).run(inviteId);
    
    return true;
  } catch (error) {
    console.error('Error deleting invite:', error);
    return false;
  }
}