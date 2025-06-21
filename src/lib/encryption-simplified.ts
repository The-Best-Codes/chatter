// Simplified encryption utilities for the chat application
// This is a temporary solution until we implement proper end-to-end encryption

// Encrypt a message
export function encryptMessage(message: string): string {
  // Simple Base64 encoding for now
  return btoa(message);
}

// Decrypt a message
export function decryptMessage(encryptedMessage: string): string {
  try {
    // Simple Base64 decoding for now
    return atob(encryptedMessage);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return 'Failed to decrypt message';
  }
}