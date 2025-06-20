import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../auth';

// Room type definition
export interface Room {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: number;
  createdBy: string;
  memberCount?: number;
}

// Room member type definition
export interface RoomMember {
  roomId: string;
  userId: string;
  username: string;
  joinedAt: number;
  isAdmin: boolean;
}

// Create a new room
export function createRoom(
  name: string,
  description: string | null,
  isPublic: boolean,
  createdBy: User
): Room | null {
  try {
    const roomId = uuidv4();
    const now = Date.now();
    
    // Begin transaction
    const transaction = db.transaction(() => {
      // Insert room
      db.prepare(`
        INSERT INTO rooms (id, name, description, is_public, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(roomId, name, description, isPublic ? 1 : 0, now, createdBy.id);
      
      // Add creator as room admin
      db.prepare(`
        INSERT INTO room_members (room_id, user_id, joined_at, is_admin)
        VALUES (?, ?, ?, 1)
      `).run(roomId, createdBy.id, now);
    });
    
    // Execute transaction
    transaction();
    
    // Return room object
    return {
      id: roomId,
      name,
      description,
      isPublic,
      createdAt: now,
      createdBy: createdBy.id
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
}

// Get a room by ID
export function getRoomById(roomId: string): Room | null {
  try {
    const room = db.prepare(`
      SELECT id, name, description, is_public as isPublic, created_at as createdAt, created_by as createdBy
      FROM rooms
      WHERE id = ?
    `).get(roomId);
    
    if (!room) {
      return null;
    }
    
    // Get member count
    const memberCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM room_members
      WHERE room_id = ?
    `).get(roomId).count;
    
    return {
      ...room,
      memberCount
    };
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
}

// Get all public rooms
export function getPublicRooms(): Room[] {
  try {
    const rooms = db.prepare(`
      SELECT r.id, r.name, r.description, r.is_public as isPublic, 
             r.created_at as createdAt, r.created_by as createdBy,
             COUNT(rm.user_id) as memberCount
      FROM rooms r
      LEFT JOIN room_members rm ON r.id = rm.room_id
      WHERE r.is_public = 1
      GROUP BY r.id
      ORDER BY memberCount DESC, r.created_at DESC
    `).all();
    
    return rooms;
  } catch (error) {
    console.error('Error getting public rooms:', error);
    return [];
  }
}

// Get rooms for a user
export function getRoomsForUser(userId: string): Room[] {
  try {
    const rooms = db.prepare(`
      SELECT r.id, r.name, r.description, r.is_public as isPublic, 
             r.created_at as createdAt, r.created_by as createdBy,
             COUNT(rm2.user_id) as memberCount
      FROM rooms r
      JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = ?
      LEFT JOIN room_members rm2 ON r.id = rm2.room_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `).all(userId);
    
    return rooms;
  } catch (error) {
    console.error('Error getting rooms for user:', error);
    return [];
  }
}

// Join a room
export function joinRoom(roomId: string, userId: string): boolean {
  try {
    const now = Date.now();
    
    // Check if user is already in the room
    const isMember = db.prepare(`
      SELECT 1 FROM room_members
      WHERE room_id = ? AND user_id = ?
    `).get(roomId, userId);
    
    if (isMember) {
      return true; // Already a member
    }
    
    // Add user to room
    db.prepare(`
      INSERT INTO room_members (room_id, user_id, joined_at, is_admin)
      VALUES (?, ?, ?, 0)
    `).run(roomId, userId, now);
    
    return true;
  } catch (error) {
    console.error('Error joining room:', error);
    return false;
  }
}

// Leave a room
export function leaveRoom(roomId: string, userId: string): boolean {
  try {
    // Check if user is the last admin
    const isLastAdmin = db.prepare(`
      SELECT COUNT(*) as adminCount
      FROM room_members
      WHERE room_id = ? AND is_admin = 1
    `).get(roomId).adminCount === 1 && 
    db.prepare(`
      SELECT is_admin FROM room_members
      WHERE room_id = ? AND user_id = ?
    `).get(roomId, userId)?.is_admin === 1;
    
    if (isLastAdmin) {
      // If last admin, check if there are other members
      const memberCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM room_members
        WHERE room_id = ?
      `).get(roomId).count;
      
      if (memberCount > 1) {
        // Cannot leave as last admin if there are other members
        return false;
      }
      
      // If last member, delete the room
      db.prepare(`DELETE FROM rooms WHERE id = ?`).run(roomId);
      return true;
    }
    
    // Remove user from room
    db.prepare(`
      DELETE FROM room_members
      WHERE room_id = ? AND user_id = ?
    `).run(roomId, userId);
    
    return true;
  } catch (error) {
    console.error('Error leaving room:', error);
    return false;
  }
}

// Get room members
export function getRoomMembers(roomId: string): RoomMember[] {
  try {
    const members = db.prepare(`
      SELECT rm.room_id as roomId, rm.user_id as userId, u.username,
             rm.joined_at as joinedAt, rm.is_admin as isAdmin
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
      ORDER BY rm.is_admin DESC, u.username ASC
    `).all(roomId);
    
    return members;
  } catch (error) {
    console.error('Error getting room members:', error);
    return [];
  }
}

// Make user a room admin
export function makeRoomAdmin(roomId: string, userId: string): boolean {
  try {
    db.prepare(`
      UPDATE room_members
      SET is_admin = 1
      WHERE room_id = ? AND user_id = ?
    `).run(roomId, userId);
    
    return true;
  } catch (error) {
    console.error('Error making room admin:', error);
    return false;
  }
}

// Remove room admin status
export function removeRoomAdmin(roomId: string, userId: string): boolean {
  try {
    // Check if this is the last admin
    const adminCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM room_members
      WHERE room_id = ? AND is_admin = 1
    `).get(roomId).count;
    
    if (adminCount <= 1) {
      return false; // Cannot remove last admin
    }
    
    db.prepare(`
      UPDATE room_members
      SET is_admin = 0
      WHERE room_id = ? AND user_id = ?
    `).run(roomId, userId);
    
    return true;
  } catch (error) {
    console.error('Error removing room admin:', error);
    return false;
  }
}

// Update room details
export function updateRoom(
  roomId: string,
  updates: { name?: string; description?: string; isPublic?: boolean }
): boolean {
  try {
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updates.description);
    }
    
    if (updates.isPublic !== undefined) {
      updateFields.push('is_public = ?');
      params.push(updates.isPublic ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    params.push(roomId);
    
    db.prepare(`
      UPDATE rooms
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    return true;
  } catch (error) {
    console.error('Error updating room:', error);
    return false;
  }
}