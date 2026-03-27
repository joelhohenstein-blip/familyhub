import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

/**
 * Encrypt a string using AES-256-GCM
 * Returns a Base64 encoded string containing salt, iv, encrypted data, and auth tag
 */
export function encrypt(plaintext: string, secret: string): string {
  // Derive a key from the secret using PBKDF2
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(secret, salt, ITERATIONS, 32, "sha256");

  // Generate IV and cipher
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);

  // Encrypt the plaintext
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the auth tag
  const authTag = cipher.getAuthTag();

  // Combine salt + iv + encrypted + authTag and encode as Base64
  const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, "hex"), authTag]);
  return combined.toString("base64");
}

/**
 * Decrypt a string that was encrypted with encrypt()
 * Expects a Base64 encoded string containing salt, iv, encrypted data, and auth tag
 */
export function decrypt(encrypted: string, secret: string): string {
  try {
    // Decode from Base64
    const combined = Buffer.from(encrypted, "base64");

    // Extract salt, iv, encrypted data, and auth tag
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.slice(combined.length - AUTH_TAG_LENGTH);
    const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    // Derive the key using the same salt
    const derivedKey = crypto.pbkdf2Sync(secret, salt, ITERATIONS, 32, "sha256");

    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedData.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt data: " + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Hash a value using SHA-256
 * Useful for storing hashes of API keys
 */
export function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
