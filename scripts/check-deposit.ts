// Load environment variables from .env.local
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
} catch (e) {
  // .env.local might not exist
}

import { db } from "../src/shared/lib/db";

const depositId = process.argv[2];

if (!depositId) {
  console.error("Usage: npx tsx scripts/check-deposit.ts <depositId>");
  process.exit(1);
}

async function main() {
  try {
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: {
        wallet: {
          select: {
            balanceUsdt: true,
            userId: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!deposit) {
      console.error("❌ Депозит не найден");
      process.exit(1);
    }

    console.log("📊 Информация о депозите:");
    console.log(`   ID: ${deposit.id}`);
    console.log(`   Пользователь: ${deposit.user.email}`);
    console.log(`   Сумма: ${deposit.amountUsdt.toString()} USDT`);
    console.log(`   Статус: ${deposit.status}`);
    console.log(`   Provider Payment ID: ${deposit.providerPaymentId || "не указан"}`);
    console.log(`   Создан: ${deposit.createdAt.toISOString()}`);
    console.log(`   Подтверждён: ${deposit.confirmedAt?.toISOString() || "нет"}`);
    console.log(`   TxHash: ${deposit.txHash || "нет"}`);
    console.log(`\n💰 Баланс кошелька: ${deposit.wallet.balanceUsdt.toString()} USDT`);
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

