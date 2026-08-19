import { NextResponse } from "next/server";
import { getTelegramBotUsername } from "@/modules/telegram/lib/telegram-config";

/**
 * GET /api/telegram/bot-username
 * Returns the Telegram bot username for client-side use
 */
export async function GET() {
  try {
    const username = getTelegramBotUsername();
    return NextResponse.json({ username });
  } catch (error) {
    console.error("[Telegram] Error getting bot username:", error);
    return NextResponse.json({ username: null });
  }
}

