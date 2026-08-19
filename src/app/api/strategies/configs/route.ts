import { getAllStrategyConfigs } from "@/modules/strategies/lib/strategies-admin-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const configs = await getAllStrategyConfigs();
    return NextResponse.json({
      configs: configs.map((c) => ({
        type: c.type,
        name: c.name,
        minAmount: Number(c.minAmount),
        maxAmount: Number(c.maxAmount),
        minDays: c.minDays,
        maxDays: c.maxDays,
        baseMinPercent: Number(c.baseMinPercent),
        baseMaxPercent: Number(c.baseMaxPercent),
        allowMultiplier: c.allowMultiplier,
      })),
    });
  } catch (error) {
    console.error("Error getting strategy configs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get configs" },
      { status: 500 }
    );
  }
}


