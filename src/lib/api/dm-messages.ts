import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from './room-messages';
import { getWebSocketServer } from '../websocket';
import { encryptMessage } from '../encryption';

// Send a direct message
export function sendDirectMessage(
  content: string,
  senderId: string,
  dmId: string,
  encryptedContent?: string
): Message | null {
  try {
    // Check if user is part of the DM conversation
    const isParticipant = db.prepare(`
      SELECT 1 FROM direct_messages
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).get(dmId, senderId, senderId);
    
    if (!isParticipant) {
      throw new Error('User is not part of this conversation');
    }
    
    const messageId = uuidv4();
    const now = Date.now();
    
    // Encrypt the message content if not already encrypted
    const actualEncryptedContent = encryptedContent || encryptMessage(content);
    
    db.prepare(`
      INSERT INTO messages (id, content, sender_id, dm_id, created_at, has_attachment, encrypted_content)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(messageId, content, senderId, dmId, now, actualEncryptedContent);
    
    // Get the sender's username
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId) as { username: string } | undefined;
    
    const message: Message = {
      id: messageId,
      content,
      senderId,
      senderUsername: user?.username,
      dmId,
      createdAt: now,
      hasAttachment: false,
      encryptedContent: actualEncryptedContent
    };
    
    // Notify clients via WebSocket
    try {
      const wsServer = getWebSocketServer();
      wsServer.sendDMMessage(dmId, message, senderId);
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Continue even if WebSocket notification fails
    }
    
    return message;
  } catch (error) {
    console.error('Error sending direct message:', error);
    return null;
  }
}

// Get messages for a DM conversation
export function getDirectMessages(
  dmId: string,
  limit: number = 50,
  before?: number
): Message[] {
  try {
    let query = `
      SELECT m.id, m.content, m.sender_id as senderId, u.username as senderUsername,
             m.dm_id as dmId, m.created_at as createdAt, m.updated_at as updatedAt,
             m.has_attachment as hasAttachment, m.encrypted_content as encryptedContent
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.dm_id = ?
    `;
    
    const params: any[] = [dmId];
    
    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    
    const messages = db.prepare(query).all(...params) as Message[];
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting direct messages:', error);
    return [];
  }
}

// Edit a direct message
export function editDirectMessage(
  messageId: string,
  senderId: string,
  newContent: string,
  encryptedContent?: string
): boolean {
  try {
    // Check if user is the sender of the message
    const messageData = db.prepare(`
      SELECT m.sender_id, m.dm_id
      FROM messages m
      WHERE m.id = ? AND m.dm_id IS NOT NULL
    `).get(messageId) as { sender_id: string, dm_id: string } | undefined;
    
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
    const updatedMessage = db.prepare(`
      SELECT m.id, m.content, m.sender_id as senderId, u.username as senderUsername,
             m.dm_id as dmId, m.created_at as createdAt, m.updated_at as updatedAt,
             m.has_attachment as hasAttachment, m.encrypted_content as encryptedContent
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId) as Message | undefined;
    
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
    console.error('Error editing direct message:', error);
    return false;
  }
}

// Delete a direct message
export function deleteDirectMessage(messageId: string, senderId: string): boolean {
  try {
    // Get message data before deletion for WebSocket notification
    const messageData = db.prepare(`
      SELECT sender_id, dm_id FROM messages
      WHERE id = ? AND dm_id IS NOT NULL
    `).get(messageId) as { sender_id: string, dm_id: string } | undefined;
    
    if (!messageData || messageData.sender_id !== senderId) {
      return false;
    }
    
    // Delete the message
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId);
    
    // Notify clients via WebSocket
    try {
      const wsServer = getWebSocketServer();
      wsServer.notifyMessageDeleted(messageId, undefined, messageData.dm_id, senderId);
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Continue even if WebSocket notification fails
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting direct message:', error);
    return false;
  }
}