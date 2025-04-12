// frontend/src/utils/cryptoUtils.ts
const PBKDF2_ITERATIONS = 100000; // Standard recommendation
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits is recommended for AES-GCM

/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a Base64 encoded string back to an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM key from a passphrase and salt using PBKDF2.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 }, // Key usage for AES-GCM
    true, // Extractable = false is generally safer, but needs to be true for encrypt/decrypt
    ['encrypt', 'decrypt'] // Key usages
  );
}

/**
 * Encrypts username and password using AES-GCM with a derived key.
 * NOTE: This function should be used in the component responsible for SAVING credentials.
 */
export async function encryptCredentials(username: string, password: string, passphrase: string): Promise<EncryptedCredentialData> {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const ivUsername = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ivPassword = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(passphrase, salt);

    const encodedUsername = new TextEncoder().encode(username);
    const encodedPassword = new TextEncoder().encode(password);

    const ciphertextUsername = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivUsername },
        key,
        encodedUsername
    );

    const ciphertextPassword = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivPassword },
        key,
        encodedPassword
    );

    // Clear the key material from memory as soon as possible (best effort)
    // Note: Actual memory clearing in JS is complex due to GC.
    // Consider strategies like overwriting key variable if possible, though effectiveness varies.

    return {
        salt: arrayBufferToBase64(salt.buffer),
        ivUsername: arrayBufferToBase64(ivUsername.buffer),
        ciphertextUsername: arrayBufferToBase64(ciphertextUsername),
        ivPassword: arrayBufferToBase64(ivPassword.buffer),
        ciphertextPassword: arrayBufferToBase64(ciphertextPassword),
    };
}


/**
 * Decrypts username and password using AES-GCM with a derived key.
 */
export async function decryptCredentials(encryptedData: EncryptedCredentialData, passphrase: string): Promise<{ username: string; password: string }> {
  try {
    const saltBuffer = base64ToArrayBuffer(encryptedData.salt);
    const ivUsername = base64ToArrayBuffer(encryptedData.ivUsername);
    const ciphertextUsername = base64ToArrayBuffer(encryptedData.ciphertextUsername);
    const ivPassword = base64ToArrayBuffer(encryptedData.ivPassword);
    const ciphertextPassword = base64ToArrayBuffer(encryptedData.ciphertextPassword);

    const key = await deriveKey(passphrase, new Uint8Array(saltBuffer));

    const decryptedUsernameBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivUsername },
      key,
      ciphertextUsername
    );

    const decryptedPasswordBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivPassword },
      key,
      ciphertextPassword
    );

    // Decode the buffers to strings right away
    const username = new TextDecoder().decode(decryptedUsernameBuffer);
    const password = new TextDecoder().decode(decryptedPasswordBuffer);

    // Save a copy of the result first
    const result = { username, password };

    // AFTER we have extracted the data, we can attempt to clear memory
    
    // Zero out the decrypted buffers (best effort)
    try {
      new Uint8Array(decryptedUsernameBuffer).fill(0);
      new Uint8Array(decryptedPasswordBuffer).fill(0);
    } catch (e) {
      console.warn('Unable to zero out decryption buffers', e);
    }

    // Return the saved result
    return result;

  } catch (error) {
    console.error('Decryption failed:', error);
    // Distinguish between wrong passphrase and other errors if possible (often hard)
    // AES-GCM typically throws OperationError for various issues including tag mismatch (wrong key/passphrase or tampered data)
    if (error instanceof DOMException && error.name === 'OperationError') {
        throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
    }
    throw new Error('An unexpected error occurred during decryption.');
  }
}

/**
 * Generates a salted SHA-256 hash of the passphrase for verification purposes.
 * Returns both the hash and salt as Base64 strings.
 */
export async function generatePassphraseHash(passphrase: string): Promise<{hash: string, salt: string}> {
  // Generate a random salt
  const saltArray = window.crypto.getRandomValues(new Uint8Array(16));
  const salt = arrayBufferToBase64(saltArray.buffer);
  
  // Combine passphrase with salt
  const encoder = new TextEncoder();
  const passphraseData = encoder.encode(passphrase);
  const saltData = new Uint8Array(base64ToArrayBuffer(salt));
  
  // Concatenate salt and passphrase
  const combinedData = new Uint8Array(saltData.length + passphraseData.length);
  combinedData.set(saltData, 0);
  combinedData.set(passphraseData, saltData.length);
  
  // Generate SHA-256 hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedData.buffer);
  const hash = arrayBufferToBase64(hashBuffer);
  
  return { hash, salt };
}

/**
 * Verifies that a given passphrase matches the stored hash.
 * Returns true if the hash matches, false otherwise.
 */
export async function verifyPassphraseHash(
  passphrase: string, 
  storedHash: string, 
  storedSalt: string
): Promise<boolean> {
  // Regenerate the hash using the same salt
  const encoder = new TextEncoder();
  const passphraseData = encoder.encode(passphrase);
  const saltData = new Uint8Array(base64ToArrayBuffer(storedSalt));
  
  // Concatenate salt and passphrase
  const combinedData = new Uint8Array(saltData.length + passphraseData.length);
  combinedData.set(saltData, 0);
  combinedData.set(passphraseData, saltData.length);
  
  // Generate SHA-256 hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedData.buffer);
  const newHash = arrayBufferToBase64(hashBuffer);
  
  return newHash === storedHash;
}

// Interface for the stored encrypted data structure
export interface EncryptedCredentialData {
    salt: string;
    ivUsername: string;
    ciphertextUsername: string;
    ivPassword: string;
    ciphertextPassword: string;
}