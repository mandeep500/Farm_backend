import crypto from "node:crypto";

/**
 * Generates a high-entropy cryptographically secure random hex token.
 * Default 32 bytes gives 64 hex characters (256 bits of entropy).
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generates a high-entropy session ID with a recognizable prefix.
 */
export function generateSessionId(): string {
  return `sess_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Computes a SHA-256 hash of a plain token to store securely in database.
 * The raw token is sent to the user/email, while the database only ever holds this one-way hash.
 */
export function hashToken(plainToken: string): string {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
}

