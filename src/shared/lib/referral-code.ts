import { nanoid } from "nanoid";

/**
 * Generate a unique referral code for a user
 * Format: AX + 8 alphanumeric characters (A-Z0-9)
 * Total length: 10 characters
 */
export function generateReferralCode(): string {
  // Generate 8 random alphanumeric characters (uppercase only)
  const randomPart = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Ensure we have exactly 8 valid characters
  let code = "AX" + randomPart;
  
  // If somehow we got less than 8 chars, pad with more
  while (code.length < 10) {
    code += nanoid(1).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  
  return code.substring(0, 10); // Ensure exactly 10 chars
}

