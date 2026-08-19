import { getServerSession } from "@/shared/lib/auth";
import { getWalletWithSummary } from "../lib/wallet-service";
import { BalancePanelClient } from "./BalancePanelClient";

export async function BalancePanel() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return null;
  }

  const summary = await getWalletWithSummary(session.user.id);

  return <BalancePanelClient summary={summary} />;
}

