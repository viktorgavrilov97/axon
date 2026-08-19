import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getAllStrategyConfigs } from "@/modules/strategies/lib/strategies-admin-service";
import { getStrategiesAction } from "@/modules/strategies/api/get-strategies";
import { StrategiesPageClient } from "@/modules/strategies/components/StrategiesPageClient";

export default async function StrategiesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/email");
  }

  const [configs, strategiesResult] = await Promise.all([
    getAllStrategyConfigs(),
    getStrategiesAction(),
  ]);

  return (
    <StrategiesPageClient
      configs={configs.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        description: c.description,
        accentColor: c.accentColor,
        minAmount: Number(c.minAmount),
        maxAmount: Number(c.maxAmount),
        minDays: c.minDays,
        maxDays: c.maxDays,
        baseMinPercent: Number(c.baseMinPercent),
        baseMaxPercent: Number(c.baseMaxPercent),
        allowMultiplier: c.allowMultiplier,
      }))}
      strategies={strategiesResult.strategies || []}
    />
  );
}
