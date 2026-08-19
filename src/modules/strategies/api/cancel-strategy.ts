"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { cancelStrategy } from "../lib/strategies-service";

export async function cancelStrategyAction(
  strategyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    return await cancelStrategy(strategyId, user.id);
  } catch (error) {
    console.error("Error cancelling strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel strategy",
    };
  }
}


