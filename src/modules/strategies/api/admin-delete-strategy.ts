"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { deleteStrategyConfig } from "../lib/strategies-admin-service";

export async function adminDeleteStrategyConfigAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await deleteStrategyConfig(id);
    return { success: true };
  } catch (error) {
    console.error("Error deleting strategy config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete strategy config",
    };
  }
}

