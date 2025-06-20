import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from './room-messages';

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
    
    db.prepare(`
      INSERT INTO messages (id, content, sender_id, dm_id, created_at, has_attachment, encrypted_content)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(messageId, content, senderId, dmId, now, encryptedContent || null);
    
    return {
      id: messageId,
      content,
      senderId,
      dmId,
      createdAt: now,
      hasAttachment: false,
      encryptedContent
    };
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
    
    const messages = db.prepare(query).all(...params);
    
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
    const message = db.prepare(`
      SELECT sender_id FROM messages
      WHERE id = ? AND dm_id IS NOT NULL
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
    console.error('Error editing direct message:', error);
    return false;
  }
}

// Delete a direct message
export function deleteDirectMessage(messageId: string, senderId: string): boolean {
  try {
    // Check if user is the sender of the message
    const message = db.prepare(`
      SELECT sender_id FROM messages
      WHERE id = ? AND dm_id IS NOT NULL
    `).get(messageId);
    
    if (!message || message.sender_id !== senderId) {
      return false;
    }
    
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId);
    
    return true;
  } catch (error) {
    console.error('Error deleting direct message:', error);
    return false;
  }
}