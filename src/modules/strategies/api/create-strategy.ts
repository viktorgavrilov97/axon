"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { createStrategy } from "../lib/strategies-service";
import { CreateStrategyInput } from "../lib/strategies-types";

export async function createStrategyAction(
  formData: FormData
): Promise<{ success: boolean; strategyId?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const configId = formData.get("configId") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const durationDays = parseInt(formData.get("durationDays") as string);

    if (!configId || !amount || !durationDays) {
      return { success: false, error: "Missing required fields" };
    }

    const input: CreateStrategyInput = {
      configId,
      amount,
      durationDays,
    };

    return await createStrategy(user.id, input);
  } catch (error) {
    console.error("Error creating strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create strategy",
    };
  }
}

