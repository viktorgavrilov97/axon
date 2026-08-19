import { db } from "@/shared/lib/db";
import { getWalletWithSummary } from "@/modules/wallet/lib/wallet-service";
import { getTotalEarned, getBonusEarned, getTVL } from "@/modules/strategies/lib/strategies-service";
import { getAffiliateDashboard } from "@/modules/affiliate/api/get-dashboard";

/**
 * Get user statistics for Telegram bot
 */
export async function getUserTelegramStats(userId: string) {
  const [wallet, totalEarned, bonusEarned, tvl, affiliateData] = await Promise.all([
    getWalletWithSummary(userId),
    getTotalEarned(userId),
    getBonusEarned(userId),
    getTVL(userId),
    getAffiliateDashboard().catch(() => null),
  ]);

  return {
    wallet,
    totalEarned,
    bonusEarned,
    tvl,
    affiliate: affiliateData && !("error" in affiliateData) ? affiliateData : null,
  };
}

/**
 * Format balance message
 */
export function formatBalanceMessage(stats: Awaited<ReturnType<typeof getUserTelegramStats>>): string {
  const { wallet, totalEarned, bonusEarned, tvl } = stats;
  
  const available = wallet.balance;
  const total = available + tvl;
  
  return `💰 <b>Баланс</b>

💵 Доступно: <b>${available.toFixed(2)} USDT</b>
📈 В стратегиях: <b>${tvl.toFixed(2)} USDT</b>
━━━━━━━━━━━━━━━━
💎 Всего: <b>${total.toFixed(2)} USDT</b>

📊 <b>Заработок</b>
━━━━━━━━━━━━━━━━
💸 Всего заработано: <b>${totalEarned.toFixed(2)} USDT</b>
🎁 Бонусы: <b>${bonusEarned.toFixed(2)} USDT</b>`;
}

/**
 * Format statistics message
 */
export function formatStatsMessage(stats: Awaited<ReturnType<typeof getUserTelegramStats>>): string {
  const { wallet, totalEarned, bonusEarned, tvl, affiliate } = stats;
  
  const available = wallet.balance;
  const total = available + tvl;
  
  let message = `📊 <b>Статистика</b>

💰 <b>Баланс</b>
━━━━━━━━━━━━━━━━
💵 Доступно: <b>${available.toFixed(2)} USDT</b>
📈 В стратегиях: <b>${tvl.toFixed(2)} USDT</b>
💎 Всего: <b>${total.toFixed(2)} USDT</b>

💸 <b>Заработок</b>
━━━━━━━━━━━━━━━━
📈 Всего заработано: <b>${totalEarned.toFixed(2)} USDT</b>
🎁 Бонусы: <b>${bonusEarned.toFixed(2)} USDT</b>`;

  if (affiliate) {
    message += `\n\n👥 <b>Реферальная программа</b>
━━━━━━━━━━━━━━━━
🔗 Код: <code>${affiliate.referralCode}</code>
📊 Оборот: <b>${affiliate.turnover.toFixed(2)} USDT</b>
👤 Активных рефералов: <b>${affiliate.activeReferralsCount}</b>
💵 Всего заработано: <b>${affiliate.totalEarnings.toFixed(2)} USDT</b>
📅 Сегодня: <b>${affiliate.todayEarnings.toFixed(2)} USDT</b>
📆 Этот месяц: <b>${affiliate.monthEarnings.toFixed(2)} USDT</b>`;
  }

  return message;
}

/**
 * Format referrals message
 */
export function formatReferralsMessage(affiliate: NonNullable<Awaited<ReturnType<typeof getUserTelegramStats>>["affiliate"]>): string {
  let message = `👥 <b>Реферальная программа</b>

🔗 <b>Ваша реферальная ссылка:</b>
<code>${affiliate.referralLink}</code>

📊 <b>Статистика</b>
━━━━━━━━━━━━━━━━
💰 Оборот: <b>${affiliate.turnover.toFixed(2)} USDT</b>
👤 Активных рефералов: <b>${affiliate.activeReferralsCount}</b>
🔓 Открыто уровней: <b>${affiliate.openedLevels.length}</b>`;

  if (affiliate.nextLevelTurnover !== null) {
    const remaining = affiliate.nextLevelTurnover - affiliate.turnover;
    message += `\n\n🎯 До следующего уровня: <b>${remaining.toFixed(2)} USDT</b>`;
  }

  message += `\n\n💵 <b>Заработок</b>
━━━━━━━━━━━━━━━━
📈 Всего: <b>${affiliate.totalEarnings.toFixed(2)} USDT</b>
📅 Сегодня: <b>${affiliate.todayEarnings.toFixed(2)} USDT</b>
📆 Этот месяц: <b>${affiliate.monthEarnings.toFixed(2)} USDT</b>`;

  if (affiliate.firstLineReferrals.length > 0) {
    message += `\n\n👥 <b>Рефералы первой линии</b> (${affiliate.firstLineReferrals.length})`;
    affiliate.firstLineReferrals.slice(0, 5).forEach((ref, idx) => {
      const name = ref.displayName || ref.name || ref.email || "Пользователь";
      const status = ref.active ? "✅" : "⏸️";
      message += `\n${idx + 1}. ${status} ${name}`;
      if (ref.personalTurnover > 0) {
        message += ` - ${ref.personalTurnover.toFixed(2)} USDT`;
      }
    });
    if (affiliate.firstLineReferrals.length > 5) {
      message += `\n... и еще ${affiliate.firstLineReferrals.length - 5}`;
    }
  }

  return message;
}

/**
 * Format main menu message
 */
export function formatMenuMessage(): string {
  return `🤖 <b>Axon Capital Bot</b>

Выберите раздел:`;
}

/**
 * Create inline keyboard for main menu
 */
export function createMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💰 Баланс", callback_data: "menu_balance" },
        { text: "📊 Статистика", callback_data: "menu_stats" },
      ],
      [
        { text: "👥 Рефералы", callback_data: "menu_referrals" },
        { text: "⚙️ Настройки", callback_data: "menu_settings" },
      ],
    ],
  };
}

/**
 * Create inline keyboard for back to menu
 */
export function createBackToMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🔙 Главное меню", callback_data: "menu_main" }],
    ],
  };
}

/**
 * Create inline keyboard with refresh button
 */
export function createRefreshKeyboard(callbackData: string) {
  return {
    inline_keyboard: [
      [
        { text: "🔄 Обновить", callback_data: callbackData },
        { text: "🔙 Меню", callback_data: "menu_main" },
      ],
    ],
  };
}

