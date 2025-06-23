## Chatter

Chatter is a full-stack self-hostable chat application built with React, Node.js, and PostgreSQL. It allows users to create accounts, log in, and chat with each other in real-time. It is primarily designed for use on your LAN, but you can use it over the internet as well.

### Features

- **Account & Session Management:**
  - Users can create accounts and log in securely.
  - Users can customize their profile, including display name and avatar.
  - Users can manage their active login sessions, viewing details like IP address and user agent, and remotely log out other devices or the current session.
  - Supports public key identities and bundles for E2E encryption (we will work on this later).
  - Users can reset their password with help from an admin (the admin must provide a reset code).
- **Core Chat Functionality:**
  - Real-time messaging in both public/private rooms and direct messages using WebSockets.
  - Users can reply to specific messages.
  - Users have the ability to edit and delete their own messages.
  - Users can react to messages using emojis.
  - Important messages can be pinned within a room for easy access.
- **Room & Direct Message (DM) Management:**
  - A default "General" main chat room is created upon initialization and accessible to all users.
  - Users can create and join various types of rooms.
  - Users can send direct messages to other users.
  - Users can block other users to prevent unwanted direct messages.
  - Users can set customizable notification levels per room (e.g., all messages, mentions only, or none).
- **Notifications:**
  - Receive notifications for important events such as mentions, replies, and new direct messages.
  - Users can clear their notifications.
- **Administration & Permissions:**
  - The application supports configurable signup modes, including 'enabled', 'disabled', and 'invite-only'.
  - An invite code system allows administrators to generate and manage invite codes for 'invite-only' signup, with expiration options.
  - Features a robust permission system with granular default permissions for actions like sending messages, sending attachments (with size limits), direct messaging, message length limits, editing/deleting messages, reacting to messages, and message rate limits.
  - Ability to set per-user permission overrides, allowing fine-grained control over user capabilities.
  - Includes admin audit logging to track administrative actions, enhancing security and accountability.
  - User accounts can be managed with different statuses ('active', 'frozen', 'deleted'), for administrative control over user access.
