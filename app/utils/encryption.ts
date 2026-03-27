import crypto from 'crypto';

/**
 * Encrypts plaintext using AES-256-GCM
 * @param plaintext The plaintext to encrypt
 * @param key The encryption key (should be 32 bytes for AES-256)
 * @returns JSON string containing encrypted data, IV, and auth tag
 */
export function encrypt(plaintext: string, key: string): string {
  // Derive key from string (ensure it's 32 bytes)
  const keyBuffer = crypto
    .createHash('sha256')
    .update(key)
    .digest();

  // Generate random IV (16 bytes for AES)
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return combined data as JSON
  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  });
}

/**
 * Decrypts ciphertext encrypted with encrypt()
 * @param ciphertext JSON string containing encrypted data, IV, and auth tag
 * @param key The encryption key (must match the key used for encryption)
 * @returns The decrypted plaintext
 */
export function decrypt(ciphertext: string, key: string): string {
  try {
    const data = JSON.parse(ciphertext);

    // Derive key from string (ensure it's 32 bytes)
    const keyBuffer = crypto
      .createHash('sha256')
      .update(key)
      .digest();

    // Convert hex strings back to buffers
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
