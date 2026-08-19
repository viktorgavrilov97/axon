import { NextResponse } from "next/server";
import { isTelegramIntegrationGloballyEnabled } from "@/modules/telegram/lib/telegram-config";

/**
 * GET /api/telegram/check-enabled
 * Check if Telegram integration is enabled
 */
export async function GET() {
  try {
    const enabled = await isTelegramIntegrationGloballyEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("[Telegram] Error checking if enabled:", error);
    return NextResponse.json({ enabled: false });
  }
}

