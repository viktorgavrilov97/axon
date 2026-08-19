"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { isTelegramIntegrationGloballyEnabled } from "@/modules/telegram/lib/telegram-config";

export async function getProfileDataAction() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      error: "Unauthorized",
    };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  const isGoogleAccount = !!googleAccount;

  // Check if Telegram integration is enabled
  const telegramEnabled = await isTelegramIntegrationGloballyEnabled();

  const userData = await db.user.findUnique({
    where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        phone: true,
        isTwoFactorEnabled: true,
        referralCode: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUsername: true,
        telegramConnectedAt: true,
        telegramNotificationsEnabled: true,
      },
  });

  if (!userData) {
    return {
      ok: false,
      error: "User not found",
    };
  }

  return {
    ok: true,
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl,
      avatarColor: userData.avatarColor,
      phone: userData.phone,
      isTwoFactorEnabled: userData.isTwoFactorEnabled,
      isGoogleAccount,
      referralCode: userData.referralCode,
      telegramUserId: userData.telegramUserId,
      telegramChatId: userData.telegramChatId,
      telegramUsername: userData.telegramUsername,
      telegramConnectedAt: userData.telegramConnectedAt,
      telegramNotificationsEnabled: userData.telegramNotificationsEnabled,
    },
    telegramEnabled,
  };
}



