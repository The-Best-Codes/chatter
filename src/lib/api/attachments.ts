import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { User } from '../auth';
import { Message } from './room-messages';

// Attachment type definition
export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: number;
}

// Ensure the uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Save an attachment
export async function saveAttachment(
  file: File,
  messageId: string,
  user: User
): Promise<Attachment | null> {
  try {
    // Check if user has permission to send attachments
    if (!user.permissions?.canSendAttachments) {
      throw new Error('User does not have permission to send attachments');
    }
    
    const attachmentId = uuidv4();
    const now = Date.now();
    
    // Create a unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${attachmentId}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    
    // Save the file
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // Update the message to indicate it has an attachment
    db.prepare(`
      UPDATE messages
      SET has_attachment = 1
      WHERE id = ?
    `).run(messageId);
    
    // Insert attachment record
    db.prepare(`
      INSERT INTO attachments (id, message_id, filename, mime_type, size, path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attachmentId,
      messageId,
      file.name,
      file.type,
      file.size,
      uniqueFilename,
      now
    );
    
    return {
      id: attachmentId,
      messageId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      path: uniqueFilename,
      createdAt: now
    };
  } catch (error) {
    console.error('Error saving attachment:', error);
    return null;
  }
}

// Get attachments for a message
export function getAttachmentsForMessage(messageId: string): Attachment[] {
  try {
    const attachments = db.prepare(`
      SELECT id, message_id as messageId, filename, mime_type as mimeType,
             size, path, created_at as createdAt
      FROM attachments
      WHERE message_id = ?
      ORDER BY created_at ASC
    `).all(messageId);
    
    return attachments;
  } catch (error) {
    console.error('Error getting attachments for message:', error);
    return [];
  }
}

// Get attachment by ID
export function getAttachmentById(attachmentId: string): Attachment | null {
  try {
    const attachment = db.prepare(`
      SELECT id, message_id as messageId, filename, mime_type as mimeType,
             size, path, created_at as createdAt
      FROM attachments
      WHERE id = ?
    `).get(attachmentId);
    
    return attachment || null;
  } catch (error) {
    console.error('Error getting attachment by ID:', error);
    return null;
  }
}

// Delete an attachment
export function deleteAttachment(attachmentId: string, userId: string, isAdmin: boolean = false): boolean {
  try {
    // Get the attachment
    const attachment = getAttachmentById(attachmentId);
    if (!attachment) {
      return false;
    }
    
    // Check if user is the sender of the message or an admin
    if (!isAdmin) {
      const message = db.prepare(`
        SELECT sender_id FROM messages
        WHERE id = ?
      `).get(attachment.messageId);
      
      if (!message || message.sender_id !== userId) {
        return false;
      }
    }
    
    // Delete the file
    const filePath = path.join(uploadsDir, attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the attachment record
    db.prepare(`DELETE FROM attachments WHERE id = ?`).run(attachmentId);
    
    // Check if message has other attachments
    const remainingAttachments = db.prepare(`
      SELECT COUNT(*) as count
      FROM attachments
      WHERE message_id = ?
    `).get(attachment.messageId).count;
    
    if (remainingAttachments === 0) {
      // Update message to indicate it no longer has attachments
      db.prepare(`
        UPDATE messages
        SET has_attachment = 0
        WHERE id = ?
      `).run(attachment.messageId);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return false;
  }
}

// Get attachment file path
export function getAttachmentFilePath(attachmentId: string): string | null {
  try {
    const attachment = getAttachmentById(attachmentId);
    if (!attachment) {
      return null;
    }
    
    return path.join(uploadsDir, attachment.path);
  } catch (error) {
    console.error('Error getting attachment file path:', error);
    return null;
  }
}