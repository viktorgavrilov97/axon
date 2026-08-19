"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function toggleFeatureFlagAction(
  key: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await db.featureFlag.upsert({
      where: { key },
      create: {
        key,
        enabled,
      },
      update: {
        enabled,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Admin] Error toggling feature flag:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle feature flag",
    };
  }
}

