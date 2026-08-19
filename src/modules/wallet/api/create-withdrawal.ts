"use server";

import { getServerSession } from "@/shared/lib/auth";
import { requestWithdrawal } from "../lib/wallet-service";
import { validateWithdrawalAddress } from "../lib/address-validation";
import type { NetworkType } from "../lib/network-types";
import { z } from "zod";

const withdrawalSchema = z.object({
  amount: z.number().min(0.1, "Minimum withdrawal amount: $0.1"),
  // Only allow USDT networks that we can actually pay out automatically
  network: z.enum(["TRC20", "ERC20", "BEP20", "MATIC"], {
    message: "Please select a network",
  }),
  toAddress: z.string().min(1, "Address is required"),
}).superRefine((data, ctx) => {
  const validation = validateWithdrawalAddress(data.toAddress, data.network);
  if (!validation.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.error || "Invalid address",
      path: ["toAddress"],
    });
  }
});

export async function requestWithdrawalAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
    };
  }

  const amount = parseFloat(formData.get("amount") as string);
  const network = (formData.get("network") as NetworkType) || "TRC20";
  const toAddress = formData.get("toAddress") as string;

  // Validate
  const validation = withdrawalSchema.safeParse({ amount, network, toAddress });
  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation error",
    };
  }

  try {
    const withdrawal = await requestWithdrawal(session.user.id, amount, toAddress, network);

    return {
      success: true,
      withdrawalId: withdrawal.id,
    };
  } catch (error) {
    console.error("Request withdrawal error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create withdrawal request",
    };
  }
}

