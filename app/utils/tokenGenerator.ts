import crypto from 'crypto';

/**
 * Generate a secure random token for sharing
 * Returns a 32-character hex string
 */
export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}
