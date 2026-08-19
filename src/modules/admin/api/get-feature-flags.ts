"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function getFeatureFlagsAction(): Promise<{
  success: boolean;
  flags?: Array<{ key: string; enabled: boolean }>;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const flags = await db.featureFlag.findMany({
      orderBy: { key: "asc" },
    });

    return {
      success: true,
      flags: flags.map((f) => ({ key: f.key, enabled: f.enabled })),
    };
  } catch (error) {
    console.error("[Admin] Error getting feature flags:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get feature flags",
    };
  }
}

