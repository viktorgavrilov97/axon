import { db } from "@/shared/lib/db";
import { isTelegramIntegrationGloballyEnabled } from "./telegram-config";
import { sendTelegramMessage } from "./telegram-client";
import { Operation } from "@/modules/operations/lib/types";

/**
 * Format operation type for Telegram message
 */
function formatOperationType(type: Operation["type"]): string {
  const typeMap: Record<Operation["type"], string> = {
    deposit: "💰 Deposit",
    withdrawal: "💸 Withdrawal",
    strategy_profit: "📈 Daily Profit",
    strategy_bonus: "🎁 Bonus",
    strategy_investment: "💼 Investment",
    capital_return: "↩️ Capital Return",
    referral_payout: "👥 Referral Reward",
  };

  return typeMap[type] || type;
}

/**
 * Format amount with currency
 */
function formatAmount(amount: number, currency: string = "USDT"): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Format date/time for Telegram
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Build human-readable message for operation
 */
function buildOperationMessage(operation: Operation): string {
  const type = formatOperationType(operation.type);
  const amount = formatAmount(operation.amount);
  const date = formatDateTime(operation.createdAt);

  let message = `${type}\n`;
  message += `Amount: <b>${amount}</b>\n`;
  message += `Date: ${date}`;

  // Add additional context based on operation type
  if (operation.type === "deposit" && operation.txHash) {
    message += `\nTx: <code>${operation.txHash.slice(0, 10)}...</code>`;
  } else if (operation.type === "withdrawal" && operation.toAddress) {
    message += `\nTo: <code>${operation.toAddress.slice(0, 10)}...</code>`;
  } else if (
    (operation.type === "strategy_profit" ||
      operation.type === "strategy_bonus") &&
    operation.strategyName
  ) {
    message += `\nStrategy: ${operation.strategyName}`;
  } else if (operation.type === "referral_payout" && operation.description) {
    message += `\n${operation.description}`;
  }

  // Add status for withdrawals
  if (operation.type === "withdrawal") {
    const statusEmoji =
      operation.status === "COMPLETED"
        ? "✅"
        : operation.status === "REJECTED"
        ? "❌"
        : "⏳";
    message += `\nStatus: ${statusEmoji} ${operation.status}`;
  }

  return message;
}

/**
 * Send Telegram notification for an operation
 * Best-effort: errors are logged but not thrown
 */
export async function sendTelegramNotificationForOperation(
  userId: string,
  operation: Operation
): Promise<void> {
  try {
    // 1. Check global flag
    const isEnabled = await isTelegramIntegrationGloballyEnabled();
    if (!isEnabled) {
      return; // Silently return if disabled
    }

    // 2. Get user with Telegram data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        telegramNotificationsEnabled: true,
      },
    });

    if (!user) {
      return; // User not found, silently return
    }

    // 3. Check if user has Telegram connected and notifications enabled
    if (!user.telegramChatId || !user.telegramNotificationsEnabled) {
      return; // User hasn't connected Telegram or disabled notifications
    }

    // 4. Build and send message
    const message = buildOperationMessage(operation);
    await sendTelegramMessage(user.telegramChatId, message);
  } catch (error) {
    // Log error but don't throw - notifications are non-critical
    console.error(
      `[Telegram] Error sending notification for operation ${operation.id}:`,
      error
    );
  }
}

