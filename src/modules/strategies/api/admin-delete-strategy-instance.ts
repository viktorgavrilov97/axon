"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { deleteStrategyAdmin } from "../lib/strategies-admin-service";

export async function adminDeleteStrategyInstanceAction(
  strategyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    return await deleteStrategyAdmin(strategyId);
  } catch (error) {
    console.error("Error deleting strategy instance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete strategy instance",
    };
  }
}


