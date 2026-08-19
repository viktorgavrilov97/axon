import crypto from "crypto";
import { getTelegramBotToken, getTelegramLoginSecret } from "./telegram-config";

/**
 * Verify Telegram auth data from Login Widget
 * Uses HMAC-SHA256 with TELEGRAM_LOGIN_SECRET if provided, otherwise sha256(bot_token)
 */
export function verifyTelegramAuthData(
  data: Record<string, string>
): boolean {
  console.log("[Telegram] Starting auth verification with data keys:", Object.keys(data));
  
  // Try to use TELEGRAM_LOGIN_SECRET first, fallback to bot token
  const loginSecret = getTelegramLoginSecret();
  const token = getTelegramBotToken();
  
  if (!token) {
    console.error("[Telegram] Bot token not configured for auth verification");
    return false;
  }

  // Extract hash from data
  const hash = data.hash;
  if (!hash) {
    console.error("[Telegram] Hash missing from auth data");
    return false;
  }
  
  console.log("[Telegram] Hash found, token available:", !!token);

  // Create a copy without hash for verification
  // Also filter out empty values (Telegram may not send all fields)
  const dataCheck: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key !== "hash" && value !== undefined && value !== null && value !== "") {
      dataCheck[key] = String(value);
    }
  }

  // Sort fields alphabetically
  const sortedKeys = Object.keys(dataCheck).sort();
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${dataCheck[key]}`)
    .join("\n");

  // Telegram Login Widget uses sha256(bot_token) as the secret key for HMAC
  // Always use bot token, not TELEGRAM_LOGIN_SECRET (which is for custom verification)
  // According to Telegram docs: secret = sha256(bot_token)
  let secretKey: Buffer;
  if (token) {
    // Use sha256(bot_token) as per Telegram Login Widget documentation
    secretKey = crypto.createHash("sha256").update(token).digest();
  } else {
    console.error("[Telegram] Bot token not available for auth verification");
    return false;
  }

  // Calculate HMAC
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Log for debugging
  console.log("[Telegram] Auth verification:", {
    fields: sortedKeys,
    dataCheckString: dataCheckString.substring(0, 200),
    receivedHash: hash,
    calculatedHash: calculatedHash,
    match: hash.toLowerCase() === calculatedHash.toLowerCase(),
  });

  // Compare hashes (case-insensitive, as Telegram may send uppercase)
  const isValid = hash.toLowerCase() === calculatedHash.toLowerCase();

  if (!isValid) {
    console.error("[Telegram] Hash mismatch:", {
      received: hash,
      calculated: calculatedHash,
      dataCheckString,
      sortedKeys,
    });
  }

  return isValid;
}

/**
 * Extract Telegram user data from auth data
 */
export function extractTelegramUserFromAuthData(
  data: Record<string, string>
): {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
} | null {
  const id = data.id;
  if (!id) {
    return null;
  }

  return {
    id,
    username: data.username || undefined,
    first_name: data.first_name || undefined,
    last_name: data.last_name || undefined,
  };
}

