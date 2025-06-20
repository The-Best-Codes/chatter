import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Direct message conversation type
export interface DirectMessageConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Username?: string;
  user2Username?: string;
  createdAt: number;
  lastMessageAt?: number;
  lastMessagePreview?: string;
}

// Get or create a direct message conversation between two users
export function getOrCreateDMConversation(user1Id: string, user2Id: string): DirectMessageConversation | null {
  try {
    // Sort user IDs to ensure consistent ordering
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();
    
    // Check if conversation already exists
    let conversation = db.prepare(`
      SELECT id, user1_id as user1Id, user2_id as user2Id, created_at as createdAt
      FROM direct_messages
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).get(sortedUser1, sortedUser2, sortedUser2, sortedUser1);
    
    if (!conversation) {
      // Create new conversation
      const dmId = uuidv4();
      const now = Date.now();
      
      db.prepare(`
        INSERT INTO direct_messages (id, user1_id, user2_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(dmId, sortedUser1, sortedUser2, now);
      
      conversation = {
        id: dmId,
        user1Id: sortedUser1,
        user2Id: sortedUser2,
        createdAt: now
      };
    }
    
    // Get usernames
    const user1 = db.prepare('SELECT username FROM users WHERE id = ?').get(conversation.user1Id);
    const user2 = db.prepare('SELECT username FROM users WHERE id = ?').get(conversation.user2Id);
    
    if (!user1 || !user2) {
      return null;
    }
    
    // Get last message info
    const lastMessage = db.prepare(`
      SELECT created_at as createdAt, content
      FROM messages
      WHERE dm_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(conversation.id);
    
    return {
      ...conversation,
      user1Username: user1.username,
      user2Username: user2.username,
      lastMessageAt: lastMessage?.createdAt,
      lastMessagePreview: lastMessage?.content ? 
        (lastMessage.content.length > 30 ? lastMessage.content.substring(0, 30) + '...' : lastMessage.content) : 
        undefined
    };
  } catch (error) {
    console.error('Error getting or creating DM conversation:', error);
    return null;
  }
}

// Get all direct message conversations for a user
export function getDMConversationsForUser(userId: string): DirectMessageConversation[] {
  try {
    const conversations = db.prepare(`
      SELECT 
        dm.id, 
        dm.user1_id as user1Id, 
        dm.user2_id as user2Id, 
        dm.created_at as createdAt,
        u1.username as user1Username,
        u2.username as user2Username,
        (
          SELECT created_at 
          FROM messages 
          WHERE dm_id = dm.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as lastMessageAt,
        (
          SELECT substr(content, 1, 30) || CASE WHEN length(content) > 30 THEN '...' ELSE '' END
          FROM messages 
          WHERE dm_id = dm.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as lastMessagePreview
      FROM direct_messages dm
      JOIN users u1 ON dm.user1_id = u1.id
      JOIN users u2 ON dm.user2_id = u2.id
      WHERE dm.user1_id = ? OR dm.user2_id = ?
      ORDER BY lastMessageAt DESC NULLS LAST, dm.created_at DESC
    `).all(userId, userId);
    
    return conversations;
  } catch (error) {
    console.error('Error getting DM conversations for user:', error);
    return [];
  }
}

// Get a direct message conversation by ID
export function getDMConversation(dmId: string): DirectMessageConversation | null {
  try {
    const conversation = db.prepare(`
      SELECT 
        dm.id, 
        dm.user1_id as user1Id, 
        dm.user2_id as user2Id, 
        dm.created_at as createdAt,
        u1.username as user1Username,
        u2.username as user2Username
      FROM direct_messages dm
      JOIN users u1 ON dm.user1_id = u1.id
      JOIN users u2 ON dm.user2_id = u2.id
      WHERE dm.id = ?
    `).get(dmId);
    
    if (!conversation) {
      return null;
    }
    
    return conversation;
  } catch (error) {
    console.error('Error getting DM conversation by ID:', error);
    return null;
  }
}

// Check if a user is part of a DM conversation
export function isUserInDMConversation(dmId: string, userId: string): boolean {
  try {
    const conversation = db.prepare(`
      SELECT 1
      FROM direct_messages
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).get(dmId, userId, userId);
    
    return !!conversation;
  } catch (error) {
    console.error('Error checking if user is in DM conversation:', error);
    return false;
  }
}