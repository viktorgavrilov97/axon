import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getAllStrategyConfigs } from "@/modules/strategies/lib/strategies-admin-service";
import { StrategyConfigsList } from "./strategy-configs-list";

export default async function AdminStrategiesPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const configs = await getAllStrategyConfigs();

  // Convert Decimal to numbers for Client Component
  const serializedConfigs = configs.map((config) => ({
    ...config,
    minAmount: Number(config.minAmount),
    maxAmount: Number(config.maxAmount),
    baseMinPercent: Number(config.baseMinPercent),
    baseMaxPercent: Number(config.baseMaxPercent),
  }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-white-900">Strategies</h1>
          <p className="text-body text-white-700 mt-2">Strategy configurations</p>
        </div>
      </div>

      <StrategyConfigsList configs={serializedConfigs} />
    </div>
  );
}

