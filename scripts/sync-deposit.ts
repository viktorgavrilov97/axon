import { syncDepositStatusFromProvider } from "../src/modules/wallet/lib/wallet-service";

const depositId = process.argv[2];

if (!depositId) {
  console.error("Usage: npx tsx scripts/sync-deposit.ts <depositId>");
  process.exit(1);
}

async function main() {
  try {
    console.log(`Синхронизация депозита ${depositId}...`);
    const result = await syncDepositStatusFromProvider(depositId);
    console.log("✅ Синхронизация завершена:");
    console.log(`   Статус: ${result.deposit.status}`);
    console.log(`   Баланс зачислен: ${result.balanceCredited ? "Да" : "Нет"}`);
    if (result.balanceCredited) {
      console.log(`   Сумма: ${result.deposit.amountUsdt.toString()} USDT`);
    }
  } catch (error) {
    console.error("❌ Ошибка синхронизации:", error);
    process.exit(1);
  }
}

main();

