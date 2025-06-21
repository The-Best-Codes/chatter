import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getWebSocketServer } from '../websocket';
import { encryptMessage } from '../encryption';

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
    
    // Encrypt the message content if not already encrypted
    const actualEncryptedContent = encryptedContent || encryptMessage(content);
    
    db.prepare(`
      INSERT INTO messages (id, content, sender_id, room_id, created_at, has_attachment, encrypted_content)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(messageId, content, senderId, roomId, now, actualEncryptedContent);
    
    // Get the sender's username
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username: string } | undefined;
    
    const message: Message = {
      id: messageId,
      content,
      senderId,
      senderUsername: user?.username,
      roomId,
      createdAt: now,
      hasAttachment: false,
      encryptedContent: actualEncryptedContent
    };
    
    // Notify clients via WebSocket
    try {
      const wsServer = getWebSocketServer();
      wsServer.sendRoomMessage(roomId, message, senderId);
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Continue even if WebSocket notification fails
    }
    
    return message;
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
    
    const messages = db.prepare(query).all(...params) as Message[];
    
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
    const messageData = db.prepare(`
      SELECT m.sender_id, m.room_id
      FROM messages m
      WHERE m.id = ? AND m.room_id IS NOT NULL
    `).get(messageId) as { sender_id: string, room_id: string } | undefined;
    
    if (!messageData || messageData.sender_id !== senderId) {
      return false;
    }
    
    const now = Date.now();
    
    // Encrypt the message content if not already encrypted
    const actualEncryptedContent = encryptedContent || encryptMessage(newContent);
    
    db.prepare(`
      UPDATE messages
      SET content = ?, updated_at = ?, encrypted_content = ?
      WHERE id = ?
    `).run(newContent, now, actualEncryptedContent, messageId);
    
    // Get the updated message for WebSocket notification
    const updatedMessage = getMessage(messageId);
    
    // Notify clients via WebSocket
    if (updatedMessage) {
      try {
        const wsServer = getWebSocketServer();
        wsServer.notifyMessageEdited(updatedMessage);
      } catch (wsError) {
        console.error('WebSocket notification error:', wsError);
        // Continue even if WebSocket notification fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error editing room message:', error);
    return false;
  }
}

// Delete a room message
export function deleteRoomMessage(messageId: string, senderId: string, isAdmin: boolean = false): boolean {
  try {
    // Get message data before deletion for WebSocket notification
    const messageData = db.prepare(`
      SELECT sender_id, room_id FROM messages
      WHERE id = ? AND room_id IS NOT NULL
    `).get(messageId) as { sender_id: string, room_id: string } | undefined;
    
    if (!messageData) {
      return false;
    }
    
    // Check if user is the sender of the message or an admin
    if (!isAdmin && messageData.sender_id !== senderId) {
      return false;
    }
    
    // Delete the message
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId);
    
    // Notify clients via WebSocket
    try {
      const wsServer = getWebSocketServer();
      wsServer.notifyMessageDeleted(messageId, messageData.room_id, undefined, senderId);
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Continue even if WebSocket notification fails
    }
    
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
    
    return (message as Message | undefined) || null;
  } catch (error) {
    console.error('Error getting message:', error);
    return null;
  }
}