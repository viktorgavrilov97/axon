"use server";

import { signIn } from "@/modules/identity/lib/auth";
import { db } from "@/shared/lib/db";

/**
 * Server Action to create session after Telegram authentication
 * Called from client after receiving auth data from Telegram Login Widget
 */
export async function loginTelegramAction(email: string) {
  try {
    console.log("[Telegram] Login action called for email:", email);
    
    // Verify user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error("[Telegram] User not found:", email);
      return { error: "User not found" };
    }

    // Verify user has Telegram linked
    if (!user.telegramUserId) {
      console.error("[Telegram] User doesn't have Telegram linked:", email);
      return { error: "Telegram account not linked. Please connect Telegram in your profile first." };
    }

    // Note: We don't require emailVerified for Telegram login
    // Telegram already verified the user through their Login Widget

    console.log("[Telegram] Creating session for user:", user.id);

    // Create session using special marker (similar to auto_login_after_verification)
    const result = await signIn("credentials", {
      email: user.email,
      password: "telegram_login",
      redirect: false,
    });

    if (result?.error) {
      console.error("[Telegram] SignIn error:", result.error);
      return { error: result.error };
    }

    console.log("[Telegram] Session created successfully");
    return {
      success: true,
      redirectUrl: "/terminal",
    };
  } catch (error) {
    console.error("[Telegram] Login action error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create session" };
  }
}

