"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function disconnectTelegramAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: "Unauthorized" };
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        telegramUserId: null,
        telegramChatId: null,
        telegramUsername: null,
        telegramConnectedAt: null,
        telegramNotificationsEnabled: false,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("[Telegram] Error disconnecting:", error);
    return { ok: false, error: "Failed to disconnect Telegram" };
  }
}

