import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import { signIn } from "@/modules/identity/lib/auth";
import {
  isTelegramIntegrationGloballyEnabled,
} from "@/modules/telegram/lib/telegram-config";
import {
  verifyTelegramAuthData,
  extractTelegramUserFromAuthData,
} from "@/modules/telegram/lib/telegram-auth";

/**
 * POST /api/telegram/login
 * Handle Telegram authentication (Login Widget)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if integration is enabled
    const isEnabled = await isTelegramIntegrationGloballyEnabled();
    if (!isEnabled) {
      return NextResponse.json(
        { error: "Telegram integration is disabled" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const authData = body as Record<string, string>;

    // Log received data for debugging (without sensitive info)
    console.log("[Telegram] Received auth data:", {
      id: authData.id,
      username: authData.username,
      first_name: authData.first_name,
      has_hash: !!authData.hash,
      auth_date: authData.auth_date,
    });

    // Verify Telegram auth data
    const isValid = verifyTelegramAuthData(authData);
    if (!isValid) {
      console.error("[Telegram] Auth data verification failed");
      return NextResponse.json(
        { error: "Invalid Telegram auth data" },
        { status: 401 }
      );
    }

    // Extract Telegram user data
    const telegramUser = extractTelegramUserFromAuthData(authData);
    if (!telegramUser) {
      return NextResponse.json(
        { error: "Invalid Telegram user data" },
        { status: 400 }
      );
    }

    // Find user by telegramUserId
    // Now that unique constraint is applied, we can use findUnique
    let user = await db.user.findUnique({
      where: { 
        telegramUserId: telegramUser.id,
      },
    });

    if (!user) {
      // User not found by telegramUserId
      // This happens when:
      // 1. User never connected Telegram
      // 2. User disconnected Telegram in profile
      // 
      // Telegram Login Widget doesn't provide email, so we can't find user by email
      // User needs to either:
      // - Login with email/Google first, then connect Telegram in profile
      // - Or connect Telegram in profile while logged in
      console.error("[Telegram] User not found for telegramUserId:", telegramUser.id);
      return NextResponse.json(
        { 
          error: "No account linked with this Telegram account. Please login with email/Google first, then connect Telegram in your profile settings.",
          requiresProfileConnection: true,
        },
        { status: 404 }
      );
    }
    
    // Update Telegram data if it changed (username, etc.)
    // This ensures we have the latest Telegram info
    if (user.telegramUsername !== telegramUser.username) {
      await db.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: telegramUser.username || null,
          // Don't update telegramUserId or telegramChatId here - they're set when connecting via bot
        },
      });
      console.log("[Telegram] Updated Telegram username for user:", user.id);
    }

    // Note: We don't require emailVerified for Telegram login
    // Telegram already verified the user through their Login Widget

    // Return user email so frontend can create session via Server Action
    // We can't use signIn in a Route Handler, so we'll return the email
    // and the frontend will call a Server Action to create the session
    return NextResponse.json({
      success: true,
      email: user.email, // Frontend will use this to create session
    });
  } catch (error) {
    console.error("[Telegram] Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

