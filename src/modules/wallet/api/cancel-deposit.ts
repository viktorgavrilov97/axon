"use server";

import { getServerSession } from "@/shared/lib/auth";
import { cancelDeposit } from "../lib/operations-service";

export async function cancelDepositAction(depositId: string) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  try {
    await cancelDeposit(depositId, session.user.id);

    console.log("[cancelDepositAction] Deposit cancelled successfully:", depositId);
    return {
      success: true,
    };
  } catch (error) {
    console.error("[cancelDepositAction] Cancel deposit error:", error);
    return {
      error: error instanceof Error ? error.message : "Не удалось отменить депозит",
    };
  }
}

