"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { upsertStrategyConfig } from "../lib/strategies-admin-service";
import { StrategyConfigData } from "../lib/strategies-types";

export async function adminUpdateStrategyConfigAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const id = formData.get("id") as string; // Get id for update
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || null;
    const accentColor = (formData.get("accentColor") as string) || null;
    const category = (formData.get("category") as string) || undefined; // Category no longer required
    const minAmount = parseFloat(formData.get("minAmount") as string);
    const maxAmount = parseFloat(formData.get("maxAmount") as string);
    const minDays = parseInt(formData.get("minDays") as string);
    const maxDays = parseInt(formData.get("maxDays") as string);
    const baseMinPercent = parseFloat(formData.get("baseMinPercent") as string);
    const baseMaxPercent = parseFloat(formData.get("baseMaxPercent") as string);
    const allowMultiplier = formData.get("allowMultiplier") === "true";

    if (!id || !type || !name || !minAmount || !maxAmount || !minDays || !maxDays || !baseMinPercent || !baseMaxPercent) {
      return { success: false, error: "Missing required fields" };
    }

    const config: StrategyConfigData = {
      id, // Include id for update
      type: type as any,
      name,
      description: description || undefined,
      accentColor: accentColor || undefined,
      minAmount,
      maxAmount,
      minDays,
      maxDays,
      baseMinPercent,
      baseMaxPercent,
      allowMultiplier,
    };

    await upsertStrategyConfig(config);
    return { success: true };
  } catch (error) {
    console.error("Error updating strategy config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update strategy config",
    };
  }
}

