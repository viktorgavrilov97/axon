"use server";

import { getServerSession } from "@/shared/lib/auth";
import { getActiveDeposit } from "../lib/operations-service";
import { getPaymentStatus } from "../lib/oxapay";
import { getRequiredConfirmations } from "../lib/confirmation-utils";

export async function getActiveDepositAction() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Необходима авторизация",
    };
  }

  try {
    const deposit = await getActiveDeposit(session.user.id);

    if (!deposit) {
      return {
        success: true,
        deposit: null,
      };
    }

    // Use expiresAt from deposit if available, otherwise calculate (24 hours from creation)
    const expirationTime = deposit.expiresAt
      ? new Date(deposit.expiresAt)
      : (() => {
          const exp = new Date(deposit.createdAt);
          exp.setHours(exp.getHours() + 24);
          return exp;
        })();

    // Get confirmation info from OxaPay if providerPaymentId exists
    let confirmations: number | null = null;
    let requiredConfirmations: number | null = null;
    let txStatus: string | null = null;
    
    if (deposit.providerPaymentId) {
      try {
        const paymentStatus = await getPaymentStatus(deposit.providerPaymentId);
        const txs = paymentStatus.data?.txs || [];
        
        // Get the first transaction (usually there's only one)
        if (txs.length > 0) {
          const tx = txs[0];
          confirmations = tx.confirmations ?? null;
          txStatus = tx.status ?? null;
          
          if (confirmations !== null && requiredConfirmations === null) {
            const txNetwork = tx.network?.toLowerCase() || "";
            const currencyNetwork = deposit.payCurrency?.toLowerCase() || "";
            requiredConfirmations = getRequiredConfirmations(txNetwork || currencyNetwork);
          }
        }
      } catch (error) {
        console.error("Error fetching payment status from OxaPay:", error);
        // Continue without confirmation info if API call fails
      }
    }

    return {
      success: true,
      deposit: {
        id: deposit.id,
        amountUsdt: deposit.amountUsdt.toNumber(),
        payAmount: deposit.amountCrypto?.toNumber() || deposit.amountUsdt.toNumber(),
        payCurrency: deposit.payCurrency,
        address: deposit.payAddress,
        createdAt: deposit.createdAt,
        expirationTime,
        status: deposit.status,
        qrCode: null, // qrCode field doesn't exist in Prisma schema yet
        network: null, // network field doesn't exist in Prisma schema yet
        confirmations,
        requiredConfirmations,
        txStatus,
      },
    };
  } catch (error) {
    console.error("Get active deposit error:", error);
    return {
      error: "Не удалось проверить активный депозит",
    };
  }
}

