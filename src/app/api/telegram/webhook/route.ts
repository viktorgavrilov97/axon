import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import {
  isTelegramIntegrationGloballyEnabled,
  getTelegramWebhookSecret,
} from "@/modules/telegram/lib/telegram-config";
import { sendTelegramMessage, getTelegramApiBaseUrl } from "@/modules/telegram/lib/telegram-client";
import {
  getUserTelegramStats,
  formatBalanceMessage,
  formatStatsMessage,
  formatReferralsMessage,
  formatMenuMessage,
  createMainMenuKeyboard,
  createBackToMenuKeyboard,
  createRefreshKeyboard,
} from "@/modules/telegram/lib/telegram-menu";

/**
 * POST /api/telegram/webhook
 * Webhook endpoint for Telegram bot updates
 */
export async function POST(request: NextRequest) {
  try {
    // Check if integration is enabled
    const isEnabled = await isTelegramIntegrationGloballyEnabled();
    if (!isEnabled) {
      // Return 200 OK but do nothing
      return NextResponse.json({ ok: true });
    }

    // Optional: Check webhook secret from header (Telegram sends X-Telegram-Bot-Api-Secret-Token)
    const secret = getTelegramWebhookSecret();
    if (secret) {
      const headerSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      const querySecret = request.nextUrl.searchParams.get("secret");
      const providedSecret = headerSecret || querySecret;
      
      if (providedSecret !== secret) {
        console.warn("[Telegram] Webhook secret mismatch");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = await request.json();
    
    // Log incoming update for debugging (but not full JSON to avoid spam)
    console.log("[Telegram] Webhook update received:", {
      update_id: update.update_id,
      has_message: !!update.message,
      has_callback_query: !!update.callback_query,
      message_text: update.message?.text?.substring(0, 50),
    });

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message?.chat?.id?.toString();
      const messageId = callbackQuery.message?.message_id;
      const data = callbackQuery.data;

      if (!chatId) {
        console.error("[Telegram] Callback query without chat_id");
        return NextResponse.json({ ok: true });
      }

      // Find user by telegramChatId
      const user = await db.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        await sendTelegramMessage(
          chatId,
          "❌ Ваш Telegram не привязан к аккаунту. Пожалуйста, подключите Telegram в настройках профиля."
        );
        return NextResponse.json({ ok: true });
      }

      try {
        if (data === "menu_main") {
          // Show main menu
          await sendTelegramMessage(
            chatId,
            formatMenuMessage(),
            {
              reply_markup: createMainMenuKeyboard(),
              message_id: messageId,
            }
          );
        } else if (data === "menu_balance") {
          // Show balance
          const stats = await getUserTelegramStats(user.id);
          await sendTelegramMessage(
            chatId,
            formatBalanceMessage(stats),
            {
              reply_markup: createRefreshKeyboard("menu_balance"),
              message_id: messageId,
            }
          );
        } else if (data === "menu_stats") {
          // Show statistics
          const stats = await getUserTelegramStats(user.id);
          await sendTelegramMessage(
            chatId,
            formatStatsMessage(stats),
            {
              reply_markup: createRefreshKeyboard("menu_stats"),
              message_id: messageId,
            }
          );
        } else if (data === "menu_referrals") {
          // Show referrals
          const stats = await getUserTelegramStats(user.id);
          if (stats.affiliate) {
            await sendTelegramMessage(
              chatId,
              formatReferralsMessage(stats.affiliate),
              {
                reply_markup: createRefreshKeyboard("menu_referrals"),
                message_id: messageId,
              }
            );
          } else {
            await sendTelegramMessage(
              chatId,
              "❌ Не удалось загрузить данные реферальной программы.",
              {
                reply_markup: createBackToMenuKeyboard(),
                message_id: messageId,
              }
            );
          }
        } else if (data === "menu_settings") {
          // Show settings
          const notificationsStatus = user.telegramNotificationsEnabled ? "✅ Включены" : "❌ Выключены";
          await sendTelegramMessage(
            chatId,
            `⚙️ <b>Настройки</b>\n\n🔔 Уведомления: ${notificationsStatus}\n\nИзменить настройки можно в профиле на сайте.`,
            {
              reply_markup: createBackToMenuKeyboard(),
              message_id: messageId,
            }
          );
        }

        // Answer callback query to remove loading state
        const apiUrl = getTelegramApiBaseUrl();
        if (apiUrl) {
          await fetch(`${apiUrl}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
            }),
          });
        }
      } catch (error) {
        console.error("[Telegram] Error handling callback query:", error);
        await sendTelegramMessage(
          chatId,
          "❌ Произошла ошибка при обработке запроса.",
          {
            reply_markup: createBackToMenuKeyboard(),
            message_id: messageId,
          }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Handle /start link_<token> command
    if (update.message?.text) {
      const messageText = update.message.text.trim();
      console.log(`[Telegram] Received message: "${messageText}"`);
      console.log(`[Telegram] Message entities:`, JSON.stringify(update.message.entities, null, 2));
      
      // Check if it's a /start command with parameters
      if (messageText.startsWith("/start")) {
        console.log(`[Telegram] /start command detected, full text: "${messageText}"`);
        console.log(`[Telegram] Message length: ${messageText.length}`);
        
        // Extract token from /start link_<token> or /start link_<token> (with space)
        if (messageText.startsWith("/start link_")) {
          console.log("[Telegram] Processing /start link_ command");
          const token = messageText.replace("/start link_", "").trim();
          console.log(`[Telegram] Extracted token: ${token.substring(0, 8)}...`);
          console.log(`[Telegram] Full token length: ${token.length}`);

          // Find link token
          const linkToken = await db.telegramLinkToken.findUnique({
            where: { token },
            include: { user: true },
          });

          if (!linkToken) {
            console.log(`[Telegram] Invalid link token: ${token}`);
            // Send error message to user
            if (update.message?.chat?.id) {
              await sendTelegramMessage(
                update.message.chat.id.toString(),
                "❌ Invalid or expired link token. Please try connecting again from your profile."
              );
            }
            return NextResponse.json({ ok: true });
          }

          // Check if token is expired (15 minutes)
          const tokenAge = Date.now() - linkToken.createdAt.getTime();
          const fifteenMinutes = 15 * 60 * 1000;
          if (tokenAge > fifteenMinutes) {
            console.log(`[Telegram] Expired link token: ${token}`);
            // Send error message to user
            if (update.message?.chat?.id) {
              await sendTelegramMessage(
                update.message.chat.id.toString(),
                "❌ Link token has expired. Please try connecting again from your profile."
              );
            }
            return NextResponse.json({ ok: true });
          }

          // Check if token already consumed
          if (linkToken.consumedAt) {
            console.log(`[Telegram] Token already consumed: ${token}`);
            // Send message to user
            if (update.message?.chat?.id) {
              await sendTelegramMessage(
                update.message.chat.id.toString(),
                "✅ This Telegram account is already linked to your Axon account."
              );
            }
            return NextResponse.json({ ok: true });
          }

          // Extract Telegram user data
          const from = update.message.from;
          if (!from || !from.id) {
            console.error("[Telegram] Missing 'from' data in update");
            return NextResponse.json({ ok: true });
          }

          const telegramUserId = from.id.toString();
          const telegramChatId = update.message.chat.id.toString();
          const telegramUsername = from.username || null;

          // Update user with Telegram data
          await db.$transaction(async (tx) => {
            // Mark token as consumed
            await tx.telegramLinkToken.update({
              where: { id: linkToken.id },
              data: { consumedAt: new Date() },
            });

            // Update user
            await tx.user.update({
              where: { id: linkToken.userId },
              data: {
                telegramUserId,
                telegramChatId,
                telegramUsername,
                telegramConnectedAt: new Date(),
                telegramNotificationsEnabled: true,
              },
            });
          });

          // Send welcome message with menu
          try {
            await sendTelegramMessage(
              telegramChatId,
              "✅ <b>Telegram connected!</b>\n\nYou'll receive real-time notifications about your operations here.",
              {
                reply_markup: createMainMenuKeyboard(),
              }
            );
            console.log(`[Telegram] Welcome message with menu sent to chat ${telegramChatId}`);
          } catch (messageError) {
            console.error("[Telegram] Failed to send welcome message:", messageError);
            // Don't fail the whole operation if message sending fails
          }

          console.log(
            `[Telegram] Successfully linked Telegram account ${telegramUserId} to user ${linkToken.userId}`
          );
        } else if (messageText === "/start" || messageText.startsWith("/start ")) {
          // User sent /start without link_ token or with other parameters
          console.log("[Telegram] Received /start command without link_ token");
          if (update.message?.chat?.id) {
            const chatId = update.message.chat.id.toString();
            
            // Check if user is already connected
            const existingUser = await db.user.findFirst({
              where: { telegramChatId: chatId },
            });

            if (existingUser) {
              // User is already connected, show menu
              await sendTelegramMessage(
                chatId,
                formatMenuMessage(),
                {
                  reply_markup: createMainMenuKeyboard(),
                }
              );
            } else {
              // User is not connected, show instructions
              await sendTelegramMessage(
                chatId,
                "👋 <b>Hello!</b>\n\n" +
                "To connect your Telegram account to Axon:\n\n" +
                "1️⃣ Go to your profile settings on Axon\n" +
                "2️⃣ Click \"Connect Telegram\" button\n" +
                "3️⃣ This will open a special link - click \"Start\" when prompted\n\n" +
                "⚠️ <b>Important:</b> You must use the link from your profile, not open the bot directly!"
              );
            }
          }
        }
      }
    } else {
      // Log other update types for debugging
      console.log("[Telegram] Received update without text message:", {
        update_id: update.update_id,
        has_message: !!update.message,
        message_type: update.message?.chat?.type,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram] Webhook error:", error);
    // Always return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true });
  }
}

