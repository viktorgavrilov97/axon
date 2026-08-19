import { NextRequest } from "next/server";
import { authedJson } from "@/shared/lib/api/authed-response";
import { getCurrentUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { db } from "@/shared/lib/db";
import {
  isTelegramIntegrationGloballyEnabled,
  getTelegramBotUsername,
} from "@/modules/telegram/lib/telegram-config";
import { randomBytes } from "crypto";

/**
 * POST /api/telegram/link
 * Generate a deep-link token for connecting Telegram account
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication - wrap in try-catch to handle any auth errors
    let user;
    try {
      user = await getCurrentUser();
    } catch (authError) {
      console.error("[Telegram] Auth error:", authError);
      return authedJson(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      return authedJson(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if integration is enabled
    let isEnabled;
    try {
      isEnabled = await isTelegramIntegrationGloballyEnabled();
    } catch (error) {
      console.error("[Telegram] Error checking feature flag:", error);
      // Continue anyway - if feature flag check fails, assume disabled
      isEnabled = false;
    }

    if (!isEnabled) {
      return authedJson(
        { error: "Telegram integration is disabled" },
        { status: 403 }
      );
    }

    // Check if already connected
    let userWithTelegram;
    try {
      userWithTelegram = await db.user.findUnique({
        where: { id: user.id },
        select: { telegramChatId: true },
      });
    } catch (dbError) {
      console.error("[Telegram] DB error checking connection:", dbError);
      return authedJson(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (userWithTelegram?.telegramChatId) {
      return authedJson(
        { error: "Telegram is already connected" },
        { status: 400 }
      );
    }

    // Generate unique token (16 bytes = 32 hex chars, which fits in Telegram's 64 char limit with "link_" prefix)
    // Telegram allows up to 64 chars for start parameter, so we use 16 bytes (32 hex) + "link_" (5) = 37 chars total
    const token = randomBytes(16).toString("hex");

    // Create link token (expires in 15 minutes)
    try {
      await db.telegramLinkToken.create({
        data: {
          userId: user.id,
          token,
        },
      });
    } catch (dbError) {
      console.error("[Telegram] DB error creating token:", dbError);
      return authedJson(
        { error: "Failed to create link token" },
        { status: 500 }
      );
    }

    // Build deep-link URL
    const botUsername = getTelegramBotUsername();
    if (!botUsername) {
      return authedJson(
        { error: "Telegram bot username not configured" },
        { status: 500 }
      );
    }

    const url = `https://t.me/${botUsername}?start=link_${token}`;

    return authedJson({ url }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Telegram] Link error:", error);
    return authedJson(
      { error: "Failed to generate link" },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

