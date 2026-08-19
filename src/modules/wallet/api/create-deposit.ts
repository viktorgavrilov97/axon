"use server";

import { getServerSession } from "@/shared/lib/auth";
import { createDeposit, MIN_DEPOSIT_USDT } from "../lib/wallet-service";

export async function createDepositAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  const amountUsdt = parseFloat(formData.get("amount") as string);
  const network = (formData.get("network") as string) || "TRC20";
  const currency = (formData.get("currency") as string) || "USDT";
  const fromAmount = formData.get("fromAmount") ? parseFloat(formData.get("fromAmount") as string) : undefined;

  // Validate amount
  if (isNaN(amountUsdt) || amountUsdt <= 0) {
    return {
      error: "Введите корректную сумму",
    };
  }

  // Validate: only whole numbers for USDT
  if (currency === "USDT" && !Number.isInteger(amountUsdt)) {
    return {
      error: "Сумма должна быть целым числом (20, 30, 50, 100 и т.д.)",
    };
  }

  // Validate minimum amount
  if (amountUsdt < MIN_DEPOSIT_USDT) {
    return {
      error: `Минимальная сумма пополнения: ${MIN_DEPOSIT_USDT} USDT`,
    };
  }

  try {
    const result = await createDeposit(
      session.user.id, 
      amountUsdt, 
      network,
      currency,
      fromAmount
    );

    return {
      success: true,
      depositId: result.deposit.id,
      payAddress: result.payAddress,
      payAmount: result.payAmount,
      payCurrency: result.deposit.payCurrency,
      qrCode: result.qrCode,
      network: result.network,
    };
  } catch (error) {
    console.error("Create deposit error:", error);
    
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Handle minimum amount error
      if (errorMessage.includes("Minimum deposit")) {
        return {
          error: errorMessage,
        };
      }
      
      // Handle OxaPay errors
      if (errorMessage.includes("AMOUNT_MINIMAL_ERROR")) {
        return {
          error: `Сумма меньше минимальной. Минимум: ${MIN_DEPOSIT_USDT} USDT`,
        };
      }
      
      return {
        error: errorMessage,
      };
    }
    
    return {
      error: "Не удалось создать депозит. Попробуйте ещё раз.",
    };
  }
}

