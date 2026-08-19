"use server";

import { getServerSession } from "@/shared/lib/auth";
import { syncDepositStatusFromProvider } from "../lib/wallet-service";
import { db } from "@/shared/lib/db";

/**
 * Server action to manually sync deposit status from OxaPay
 */
export async function syncDepositStatusAction(depositId: string) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  // Verify deposit belongs to user
  const deposit = await db.deposit.findUnique({
    where: { id: depositId },
    include: { wallet: true },
  });

  if (!deposit) {
    return {
      error: "Депозит не найден",
    };
  }

  if (deposit.wallet.userId !== session.user.id) {
    return {
      error: "Нет доступа к этому депозиту",
    };
  }

  try {
    const result = await syncDepositStatusFromProvider(depositId);

    return {
      success: true,
      deposit: result.deposit,
      balanceCredited: result.balanceCredited,
    };
  } catch (error) {
    console.error("Sync deposit status error:", error);
    return {
      error: error instanceof Error ? error.message : "Не удалось синхронизировать статус",
    };
  }
}

