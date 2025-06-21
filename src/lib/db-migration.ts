import { db } from './db';

// Check if the max_attachment_size column exists in user_permissions table
const userPermissionsColumns = db.prepare(`
  PRAGMA table_info(user_permissions)
`).all() as { name: string }[];

const hasMaxAttachmentSize = userPermissionsColumns.some(col => col.name === 'max_attachment_size');

if (!hasMaxAttachmentSize) {
  console.log('Adding max_attachment_size column to user_permissions table...');
  db.exec(`
    ALTER TABLE user_permissions
    ADD COLUMN max_attachment_size INTEGER DEFAULT 5242880
  `);
}

// Check if the max_attachment_size column exists in default_permissions table
const defaultPermissionsColumns = db.prepare(`
  PRAGMA table_info(default_permissions)
`).all() as { name: string }[];

const hasDefaultMaxAttachmentSize = defaultPermissionsColumns.some(col => col.name === 'max_attachment_size');

if (!hasDefaultMaxAttachmentSize) {
  console.log('Adding max_attachment_size column to default_permissions table...');
  db.exec(`
    ALTER TABLE default_permissions
    ADD COLUMN max_attachment_size INTEGER DEFAULT 5242880
  `);
}

console.log('Database migration completed successfully.');