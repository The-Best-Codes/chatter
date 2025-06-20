// This file contains utilities for end-to-end encryption of messages

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
  const exported = await window.crypto.subtle.exportKey(
    "spki",
    publicKey
  );
  return arrayBufferToBase64(exported);
}

// Export private key to string format (for storage in localStorage)
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey(
    "pkcs8",
    privateKey
  );
  return arrayBufferToBase64(exported);
}

// Import public key from string format
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const binaryDer = base64ToArrayBuffer(publicKeyString);
  
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
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
  const binaryDer = base64ToArrayBuffer(privateKeyString);
  
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt a message with a recipient's public key
export async function encryptMessage(message: string, publicKey: CryptoKey): Promise<string> {
  // Convert the message to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Encrypt the message
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

// Decrypt a message with the user's private key
export async function decryptMessage(encryptedMessage: string, privateKey: CryptoKey): Promise<string> {
  // Convert the base64 string to ArrayBuffer
  const encryptedData = base64ToArrayBuffer(encryptedMessage);
  
  // Decrypt the message
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

// Generate a symmetric key for group encryption
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export symmetric key to string format
export async function exportSymmetricKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Import symmetric key from string format
export async function importSymmetricKey(keyString: string): Promise<CryptoKey> {
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

// Encrypt a message with a symmetric key (for group chats)
export async function encryptWithSymmetricKey(message: string, key: CryptoKey): Promise<string> {
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Convert the message to ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Encrypt the message
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedData), iv.length);
  
  // Convert to base64 string
  return arrayBufferToBase64(result.buffer);
}

// Decrypt a message with a symmetric key
export async function decryptWithSymmetricKey(encryptedMessage: string, key: CryptoKey): Promise<string> {
  // Convert the base64 string to ArrayBuffer
  const data = base64ToArrayBuffer(encryptedMessage);
  
  // Extract IV and encrypted data
  const iv = new Uint8Array(data, 0, 12);
  const encryptedData = new Uint8Array(data, 12);
  
  // Decrypt the message
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encryptedData
  );
  
  // Convert decrypted data to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}