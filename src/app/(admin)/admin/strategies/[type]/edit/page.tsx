import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getStrategyConfigById, getStrategyConfig } from "@/modules/strategies/lib/strategies-admin-service";
import { StrategyAdminForm } from "@/modules/strategies/components/StrategyAdminForm";
import { StrategyType } from "@prisma/client";
import { StrategyConfigData } from "@/modules/strategies/lib/strategies-types";

export default async function AdminEditStrategyPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const { type } = await params;
  // Try to get by ID first (new way), fallback to type (backward compatibility)
  let config = await getStrategyConfigById(type);
  if (!config) {
    config = await getStrategyConfig(type as StrategyType);
  }

  if (!config) {
    redirect("/admin/strategies");
  }

  const configData: StrategyConfigData = {
    id: config.id,
    type: config.type,
    name: config.name,
    minAmount: Number(config.minAmount),
    maxAmount: Number(config.maxAmount),
    minDays: config.minDays,
    maxDays: config.maxDays,
    baseMinPercent: Number(config.baseMinPercent),
    baseMaxPercent: Number(config.baseMaxPercent),
    allowMultiplier: config.allowMultiplier,
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-display text-white-900 mb-6">Edit Strategy Configuration</h1>
      <StrategyAdminForm config={configData} />
    </div>
  );
}

