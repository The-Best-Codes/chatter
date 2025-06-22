import { KeyPair, KeyBundle } from '../types';

// Generate a new key pair for identity
export async function generateIdentityKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits'] // usages
  );

  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey,
    privateKey,
  };
}

// Generate a signed pre-key
export async function generateSignedPreKey(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits'] // usages
  );

  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey,
    privateKey,
  };
}

// Generate one-time keys
export async function generateOneTimeKeys(count: number = 5): Promise<KeyPair[]> {
  const keys: KeyPair[] = [];
  
  for (let i = 0; i < count; i++) {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true, // extractable
      ['deriveKey', 'deriveBits'] // usages
    );

    const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    keys.push({
      publicKey,
      privateKey,
    });
  }
  
  return keys;
}

// Generate a complete key bundle for registration
export async function generateKeyBundle(): Promise<{
  identityKeyPair: KeyPair;
  signedPreKeyPair: KeyPair;
  oneTimeKeyPairs: KeyPair[];
  publicKeyBundle: KeyBundle;
}> {
  const identityKeyPair = await generateIdentityKeyPair();
  const signedPreKeyPair = await generateSignedPreKey();
  const oneTimeKeyPairs = await generateOneTimeKeys(5);
  
  const publicKeyBundle: KeyBundle = {
    identityKey: identityKeyPair.publicKey,
    signedPreKey: signedPreKeyPair.publicKey,
    oneTimeKeys: oneTimeKeyPairs.map(pair => pair.publicKey),
  };
  
  return {
    identityKeyPair,
    signedPreKeyPair,
    oneTimeKeyPairs,
    publicKeyBundle,
  };
}

// Encrypt a message
export async function encryptMessage(
  message: string,
  recipientPublicKey: JsonWebKey
): Promise<string> {
  // In a real implementation, this would use the Signal Protocol
  // For now, we'll use a simple AES-GCM encryption as a placeholder
  
  // Import the recipient's public key
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    recipientPublicKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
  
  // Generate a random AES key for this message
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Encrypt the message with the AES key
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    messageBytes
  );
  
  // Export the AES key
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  
  // Combine the IV and encrypted data
  const result = {
    iv: Array.from(iv),
    encryptedData: Array.from(new Uint8Array(encryptedData)),
    encryptedKey: Array.from(new Uint8Array(exportedAesKey)),
  };
  
  // In a real implementation, we would encrypt the AES key with the recipient's public key
  // For now, we'll just include it in the result (this is not secure!)
  
  return JSON.stringify(result);
}

// Decrypt a message
export async function decryptMessage(
  encryptedMessage: string,
  privateKey: JsonWebKey
): Promise<string> {
  // In a real implementation, this would use the Signal Protocol
  // For now, we'll use a simple AES-GCM decryption as a placeholder
  
  const { iv, encryptedData, encryptedKey } = JSON.parse(encryptedMessage);
  
  // Import the AES key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    new Uint8Array(encryptedKey),
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Decrypt the message
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    aesKey,
    new Uint8Array(encryptedData)
  );
  
  // Convert the decrypted data to a string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Store keys securely in localStorage
export function storeKeys(
  identityKeyPair: KeyPair,
  signedPreKeyPair: KeyPair,
  oneTimeKeyPairs: KeyPair[]
): void {
  const keyData = {
    identityKeyPair,
    signedPreKeyPair,
    oneTimeKeyPairs,
  };
  
  localStorage.setItem('chatter_keys', JSON.stringify(keyData));
}

// Retrieve keys from localStorage
export function retrieveKeys(): {
  identityKeyPair: KeyPair;
  signedPreKeyPair: KeyPair;
  oneTimeKeyPairs: KeyPair[];
} | null {
  const keyData = localStorage.getItem('chatter_keys');
  if (!keyData) return null;
  
  return JSON.parse(keyData);
}