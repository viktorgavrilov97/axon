import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getStrategyByIdAction } from "@/modules/strategies/api/get-strategies";
import { StrategyDetailPage } from "@/modules/strategies/components/StrategyDetailPage";

export default async function StrategyDetailPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/email");
  }

  const { id } = await params;

  const result = await getStrategyByIdAction(id);

  if (!result.success || !result.strategy) {
    redirect("/strategies");
  }

  return <StrategyDetailPage strategy={result.strategy} />;
}

