import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Message type definition
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderUsername?: string;
  roomId?: string;
  dmId?: string;
  createdAt: number;
  updatedAt?: number;
  hasAttachment: boolean;
  encryptedContent?: string;
}

// Send a message to a room
export function sendRoomMessage(
  content: string,
  senderId: string,
  roomId: string,
  encryptedContent?: string
): Message | null {
  try {
    // Check if user is a member of the room
    const isMember = db.prepare(`
      SELECT 1 FROM room_members
      WHERE room_id = ? AND user_id = ?
    `).get(roomId, senderId);
    
    if (!isMember) {
      throw new Error('User is not a member of this room');
    }
    
    const messageId = uuidv4();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO messages (id, content, sender_id, room_id, created_at, has_attachment, encrypted_content)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(messageId, content, senderId, roomId, now, encryptedContent || null);
    
    return {
      id: messageId,
      content,
      senderId,
      roomId,
      createdAt: now,
      hasAttachment: false,
      encryptedContent
    };
  } catch (error) {
    console.error('Error sending room message:', error);
    return null;
  }
}

// Get messages for a room
export function getRoomMessages(
  roomId: string,
  limit: number = 50,
  before?: number
): Message[] {
  try {
    let query = `
      SELECT m.id, m.content, m.sender_id as senderId, u.username as senderUsername,
             m.room_id as roomId, m.created_at as createdAt, m.updated_at as updatedAt,
             m.has_attachment as hasAttachment, m.encrypted_content as encryptedContent
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ?
    `;
    
    const params: any[] = [roomId];
    
    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    
    const messages = db.prepare(query).all(...params);
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting room messages:', error);
    return [];
  }
}

// Edit a room message
export function editRoomMessage(
  messageId: string,
  senderId: string,
  newContent: string,
  encryptedContent?: string
): boolean {
  try {
    // Check if user is the sender of the message
    const message = db.prepare(`
      SELECT sender_id FROM messages
      WHERE id = ? AND room_id IS NOT NULL
    `).get(messageId);
    
    if (!message || message.sender_id !== senderId) {
      return false;
    }
    
    const now = Date.now();
    
    db.prepare(`
      UPDATE messages
      SET content = ?, updated_at = ?, encrypted_content = ?
      WHERE id = ?
    `).run(newContent, now, encryptedContent || null, messageId);
    
    return true;
  } catch (error) {
    console.error('Error editing room message:', error);
    return false;
  }
}

// Delete a room message
export function deleteRoomMessage(messageId: string, senderId: string, isAdmin: boolean = false): boolean {
  try {
    // Check if user is the sender of the message or an admin
    if (!isAdmin) {
      const message = db.prepare(`
        SELECT sender_id FROM messages
        WHERE id = ? AND room_id IS NOT NULL
      `).get(messageId);
      
      if (!message || message.sender_id !== senderId) {
        return false;
      }
    }
    
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId);
    
    return true;
  } catch (error) {
    console.error('Error deleting room message:', error);
    return false;
  }
}

// Get a specific message
export function getMessage(messageId: string): Message | null {
  try {
    const message = db.prepare(`
      SELECT m.id, m.content, m.sender_id as senderId, u.username as senderUsername,
             m.room_id as roomId, m.dm_id as dmId, m.created_at as createdAt, 
             m.updated_at as updatedAt, m.has_attachment as hasAttachment,
             m.encrypted_content as encryptedContent
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId);
    
    return message || null;
  } catch (error) {
    console.error('Error getting message:', error);
    return null;
  }
}