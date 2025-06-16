/**
 * Client-side cryptographic utilities using Web Crypto API.
 */

const RSA_ALGORITHM = 'RSA-SSA-PKCS1-v1_5';
const RSA_HASH = 'SHA-256';
const RSA_MODULUS_LENGTH = 2048;
const RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537

const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;

const PBKDF2_HASH = 'SHA-256';
const PBKDF2_ITERATIONS = 100000; // Recommended minimum

// --- Helper Functions ---

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- RSA Key Operations ---

/**
 * Generates an RSA key pair for signing.
 * @returns Promise<CryptoKeyPair>
 */
export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  console.log('[CryptoClient] Generating RSA key pair...');
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: RSA_ALGORITHM,
        modulusLength: RSA_MODULUS_LENGTH,
        publicExponent: RSA_PUBLIC_EXPONENT,
        hash: RSA_HASH,
      },
      true, // extractable
      ['sign', 'verify']
    );
    console.log('[CryptoClient] RSA key pair generated successfully.');
    return keyPair;
  } catch (error) {
    console.error('[CryptoClient] Error generating RSA key pair:', error);
    throw new Error('Failed to generate RSA key pair.');
  }
}

/**
 * Exports a CryptoKey (private or public) to a specific format.
 * @param format 'pkcs8' for private key, 'spki' for public key
 * @param key CryptoKey object
 * @returns Promise<ArrayBuffer>
 */
async function exportKey(format: 'pkcs8' | 'spki', key: CryptoKey): Promise<ArrayBuffer> {
  console.log(`[CryptoClient] Exporting key in ${format} format...`);
  try {
    const exported = await crypto.subtle.exportKey(format, key);
    console.log(`[CryptoClient] Key exported successfully in ${format} format.`);
    return exported;
  } catch (error) {
    console.error(`[CryptoClient] Error exporting key in ${format} format:`, error);
    throw new Error(`Failed to export ${format} key.`);
  }
}

/**
 * Exports the private key to PKCS#8 format (ArrayBuffer).
 */
export async function exportRsaPrivateKey(privateKey: CryptoKey): Promise<ArrayBuffer> {
  return exportKey('pkcs8', privateKey);
}

/**
 * Exports the public key to SPKI format (ArrayBuffer).
 */
export async function exportRsaPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return exportKey('spki', publicKey);
}

/**
 * Imports an RSA private key from PKCS#8 format.
 * @param pkcs8Key ArrayBuffer of the key
 * @returns Promise<CryptoKey>
 */
export async function importRsaPrivateKey(pkcs8Key: ArrayBuffer): Promise<CryptoKey> {
  console.log('[CryptoClient] Importing RSA private key (PKCS#8)...');
  try {
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      {
        name: RSA_ALGORITHM,
        hash: RSA_HASH,
      },
      true, // extractable
      ['sign']
    );
    console.log('[CryptoClient] RSA private key imported successfully.');
    return privateKey;
  } catch (error) {
    console.error('[CryptoClient] Error importing RSA private key:', error);
    throw new Error('Failed to import RSA private key.');
  }
}

/**
 * Imports an RSA public key from SPKI format.
 * @param spkiKey ArrayBuffer of the key
 * @returns Promise<CryptoKey>
 */
export async function importRsaPublicKey(spkiKey: ArrayBuffer): Promise<CryptoKey> {
  console.log('[CryptoClient] Importing RSA public key (SPKI)...');
  try {
    const publicKey = await crypto.subtle.importKey(
      'spki',
      spkiKey,
      {
        name: RSA_ALGORITHM,
        hash: RSA_HASH,
      },
      true, // extractable
      ['verify']
    );
    console.log('[CryptoClient] RSA public key imported successfully.');
    return publicKey;
  } catch (error) {
    console.error('[CryptoClient] Error importing RSA public key:', error);
    throw new Error('Failed to import RSA public key.');
  }
}

// --- AES Key Operations (PBKDF2 and AES-GCM) ---

/**
 * Generates a salt for PBKDF2.
 * @returns Uint8Array (16 bytes)
 */
export function generateSalt(): Uint8Array {
  console.log('[CryptoClient] Generating salt...');
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generates an IV for AES-GCM.
 * @returns Uint8Array (12 bytes)
 */
export function generateIv(): Uint8Array {
  console.log('[CryptoClient] Generating IV...');
  return crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV size
}

/**
 * Derives an AES encryption key from a passphrase and salt using PBKDF2.
 * @param passphrase The user's passphrase
 * @param salt The salt (Uint8Array)
 * @returns Promise<CryptoKey> AES-GCM key
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  console.log('[CryptoClient] Deriving key from passphrase using PBKDF2...');
  try {
    const masterKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH,
      },
      masterKey,
      { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
      true, // extractable (false if you don't need to export it, but true is fine for internal use)
      ['encrypt', 'decrypt']
    );
    console.log('[CryptoClient] AES key derived successfully.');
    return aesKey;
  } catch (error) {
    console.error('[CryptoClient] Error deriving key from passphrase:', error);
    throw new Error('Failed to derive encryption key from passphrase.');
  }
}

/**
 * Encrypts data using AES-GCM.
 * @param key AES CryptoKey
 * @param data Data to encrypt (ArrayBuffer)
 * @param iv Initialization Vector (Uint8Array)
 * @returns Promise<ArrayBuffer> Encrypted data
 */
export async function encryptData(key: CryptoKey, data: ArrayBuffer, iv: Uint8Array): Promise<ArrayBuffer> {
  console.log('[CryptoClient] Encrypting data with AES-GCM...');
  try {
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: AES_ALGORITHM,
        iv: iv,
      },
      key,
      data
    );
    console.log('[CryptoClient] Data encrypted successfully.');
    return encryptedData;
  } catch (error) {
    console.error('[CryptoClient] Error encrypting data:', error);
    throw new Error('Failed to encrypt data.');
  }
}

/**
 * Decrypts data using AES-GCM.
 * @param key AES CryptoKey
 * @param encryptedData Encrypted data (ArrayBuffer)
 * @param iv Initialization Vector (Uint8Array)
 * @returns Promise<ArrayBuffer> Decrypted data
 */
export async function decryptData(key: CryptoKey, encryptedData: ArrayBuffer, iv: Uint8Array): Promise<ArrayBuffer> {
  console.log('[CryptoClient] Decrypting data with AES-GCM...');
  try {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    );
    console.log('[CryptoClient] Data decrypted successfully.');
    return decryptedData;
  } catch (error) {
    console.error('[CryptoClient] Error decrypting data (possibly wrong passphrase/key or tampered data):', error);
    throw new Error('Failed to decrypt data. Check passphrase or data integrity.');
  }
}

// --- Signing ---

/**
 * Signs data using an RSA private key.
 * @param privateKey RSA private CryptoKey
 * @param data Data to sign (ArrayBuffer)
 * @returns Promise<ArrayBuffer> Signature
 */
export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  console.log('[CryptoClient] Signing data with RSA private key...');
  try {
    const signature = await crypto.subtle.sign(
      {
        name: RSA_ALGORITHM,
        hash: RSA_HASH, // This should match the hash used in key generation
      },
      privateKey,
      data
    );
    console.log('[CryptoClient] Data signed successfully.');
    return signature;
  } catch (error) {
    console.error('[CryptoClient] Error signing data:', error);
    throw new Error('Failed to sign data.');
  }
}

/**
 * Type definition for the canonical transaction payload for signing.
 * Fields must be in the specified order for serialization.
 */
export interface CanonicalPayload {
  from: string;     // Sender's address (e.g., PVX_xxx)
  to: string;       // Recipient's address (e.g., PVX_yyy)
  amount: number;   // Numeric amount
  nonce: number;    // Numeric nonce
  timestamp: number; // Numeric timestamp (e.g., Date.now())
  // memo?: string; // Optional: The spec did not include memo, if needed it should be added consistently.
}

/**
 * Prepares a transaction payload string for signing using a specific pipe-delimited format.
 * The order of fields is critical for consistent signature generation and verification.
 * Format: from|to|amount|nonce|timestamp
 * @param payload The transaction payload object adhering to CanonicalPayload.
 * @returns string The pipe-delimited string representation of the payload.
 */
export function serializeTransactionPayload(payload: CanonicalPayload): string {
  console.log('[CryptoClient] Serializing transaction payload for signing (pipe-delimited):', payload);
  // Critical: Ensure the order of concatenation matches exactly what the server expects for verification.
  // Also ensure that all parts are present and correctly typed (e.g. amount, nonce, timestamp as numbers).
  if (
    typeof payload.from !== 'string' ||
    typeof payload.to !== 'string' ||
    typeof payload.amount !== 'number' ||
    typeof payload.nonce !== 'number' ||
    typeof payload.timestamp !== 'number'
  ) {
    console.error('[CryptoClient] Invalid payload for serialization. All fields must be correctly typed and present.', payload);
    throw new Error('Invalid payload structure or types for signing.');
  }

  const payloadString = `${payload.from}|${payload.to}|${payload.amount}|${payload.nonce}|${payload.timestamp}`;
  console.log('[CryptoClient] Serialized payload string:', payloadString);
  return payloadString;
}
