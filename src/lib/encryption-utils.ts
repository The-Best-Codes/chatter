/**
 * Encryption utilities for end-to-end encryption of messages
 * 
 * This module provides functions for generating key pairs, encrypting and decrypting messages,
 * and managing encryption keys for secure communication.
 */

// Generate a key pair for a user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export public key to string format
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

// Export private key to string format (for storage in local storage)
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  return arrayBufferToBase64(exported);
}

// Import public key from string format
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(publicKeyString);
  return await window.crypto.subtle.importKey(
    "spki",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Import private key from string format
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(privateKeyString);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt a message with a public key
export async function encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
  // Convert message to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    data
  );
  
  // Convert encrypted data to base64 string
  return arrayBufferToBase64(encryptedData);
}

// Decrypt a message with a private key
export async function decryptMessage(encryptedMessage: string, privateKey: CryptoKey): Promise<string> {
  // Convert base64 string to ArrayBuffer
  const encryptedData = base64ToArrayBuffer(encryptedMessage);
  
  // Decrypt the data
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encryptedData
  );
  
  // Convert decrypted data to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Generate a symmetric key for encrypting messages in a room
export async function generateRoomKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export room key to string format
export async function exportRoomKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Import room key from string format
export async function importRoomKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString);
  return await window.crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message with a room key
export async function encryptRoomMessage(message: string, roomKey: CryptoKey): Promise<string> {
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Convert message to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    roomKey,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // Convert to base64 string
  return arrayBufferToBase64(combined.buffer);
}

// Decrypt a message with a room key
export async function decryptRoomMessage(encryptedMessage: string, roomKey: CryptoKey): Promise<string> {
  // Convert base64 string to ArrayBuffer
  const combined = base64ToArrayBuffer(encryptedMessage);
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  // Decrypt the data
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv)
    },
    roomKey,
    encryptedData
  );
  
  // Convert decrypted data to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Store keys in local storage
export function storeKeys(userId: string, publicKey: string, privateKey: string): void {
  localStorage.setItem(`chatter_public_key_${userId}`, publicKey);
  localStorage.setItem(`chatter_private_key_${userId}`, privateKey);
}

// Retrieve keys from local storage
export function retrieveKeys(userId: string): { publicKey: string | null, privateKey: string | null } {
  return {
    publicKey: localStorage.getItem(`chatter_public_key_${userId}`),
    privateKey: localStorage.getItem(`chatter_private_key_${userId}`)
  };
}

// Initialize encryption for a user
export async function initializeUserEncryption(userId: string): Promise<{ publicKey: string, privateKey: string }> {
  // Check if keys already exist
  const existingKeys = retrieveKeys(userId);
  if (existingKeys.publicKey && existingKeys.privateKey) {
    return {
      publicKey: existingKeys.publicKey,
      privateKey: existingKeys.privateKey
    };
  }
  
  // Generate new key pair
  const keyPair = await generateKeyPair();
  
  // Export keys to string format
  const publicKey = await exportPublicKey(keyPair.publicKey);
  const privateKey = await exportPrivateKey(keyPair.privateKey);
  
  // Store keys
  storeKeys(userId, publicKey, privateKey);
  
  return { publicKey, privateKey };
}