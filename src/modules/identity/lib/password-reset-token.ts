/**
 * Password reset token management
 * 
 * Security features:
 * - Tokens are hashed before storage (like GitHub/Stripe)
 * - One-time use only
 * - 30 minute expiration
 * - Rate limiting protection
 */

import { db } from "@/shared/lib/db";
import { randomBytes, createHash } from "crypto";

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
const TOKEN_EXPIRY_MINUTES = 30;
const RATE_LIMIT_SECONDS = 30;

/**
 * Generate a secure random token
 * @returns Hex string token (64 characters)
 */
export function generateResetToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Hash a token using SHA-256
 * @param token - Plain text token
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a password reset token for a user
 * @param userId - User ID
 * @returns Plain text token (to be sent via email)
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate all existing tokens for this user
  await db.passwordResetToken.updateMany({
    where: {
      userId,
      consumed: false,
    },
    data: {
      consumed: true,
    },
  });

  // Generate new token
  const token = generateResetToken();
  const tokenHash = hashToken(token);

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  // Save to database
  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a password reset token without consuming it (for checking validity)
 * @param token - Plain text token from email
 * @returns User ID if token is valid, null otherwise
 */
export async function verifyPasswordResetToken(
  token: string,
  consume: boolean = true
): Promise<{ valid: boolean; userId?: string }> {
  const tokenHash = hashToken(token);

  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken) {
    return { valid: false };
  }

  // Check if token is consumed
  if (resetToken.consumed) {
    return { valid: false };
  }

  // Check if token is expired
  if (resetToken.expiresAt < new Date()) {
    return { valid: false };
  }

  // Check if user still exists
  if (!resetToken.user) {
    return { valid: false };
  }

  // Mark token as consumed only if requested
  if (consume) {
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { consumed: true },
    });
  }

  return { valid: true, userId: resetToken.userId };
}

/**
 * Check if user can request a new password reset (rate limiting)
 * @param email - User email
 * @returns true if can request, false if rate limited
 */
export async function canRequestPasswordReset(email: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Always allow for non-existent users (to prevent enumeration)
    return true;
  }

  // Check for recent token creation
  const recentToken = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - RATE_LIMIT_SECONDS * 1000),
      },
    },
  });

  return !recentToken;
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await db.passwordResetToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

