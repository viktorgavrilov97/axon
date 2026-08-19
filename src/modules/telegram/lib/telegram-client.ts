import { getTelegramBotToken } from "./telegram-config";
import { isTelegramIntegrationGloballyEnabled } from "./telegram-config";

/**
 * Get Telegram Bot API base URL
 */
export function getTelegramApiBaseUrl(): string | null {
  const token = getTelegramBotToken();
  if (!token) {
    return null;
  }
  return `https://api.telegram.org/bot${token}`;
}

/**
 * Send a message to a Telegram chat
 * Best-effort: errors are logged but not thrown
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    reply_markup?: any;
    message_id?: number;
  }
): Promise<void> {
  // Check if integration is enabled
  const isEnabled = await isTelegramIntegrationGloballyEnabled();
  if (!isEnabled) {
    console.log("[Telegram] Integration disabled, skipping message");
    return;
  }

  const token = getTelegramBotToken();
  if (!token) {
    console.error("[Telegram] Bot token not configured");
    return;
  }

  const apiUrl = getTelegramApiBaseUrl();
  if (!apiUrl) {
    console.error("[Telegram] Failed to build API URL");
    return;
  }

  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML", // Allow basic HTML formatting
    };

    if (options?.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }

    // If message_id is provided, edit message instead of sending new one
    const method = options?.message_id ? "editMessageText" : "sendMessage";
    if (options?.message_id) {
      payload.message_id = options.message_id;
    }

    const response = await fetch(`${apiUrl}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[Telegram] Failed to ${method}: ${response.status} ${response.statusText}`,
        errorData
      );
      return;
    }

    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram] API returned error:", data);
      return;
    }
  } catch (error) {
    // Log error but don't throw - Telegram notifications are non-critical
    console.error("[Telegram] Error sending message:", error);
  }
}

