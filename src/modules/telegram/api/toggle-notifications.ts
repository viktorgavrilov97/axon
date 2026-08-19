"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function toggleTelegramNotificationsAction(
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: "Unauthorized" };
    }

    await db.user.update({
      where: { id: user.id },
      data: { telegramNotificationsEnabled: enabled },
    });

    return { ok: true };
  } catch (error) {
    console.error("[Telegram] Error toggling notifications:", error);
    return { ok: false, error: "Failed to update notifications" };
  }
}

