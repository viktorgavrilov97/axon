import { getCurrentUser } from "@/shared/lib/auth";
import { TerminalTickers } from "@/modules/strategies/components/TerminalTickers";
import { AutoProfitProcessor } from "@/modules/strategies/components/AutoProfitProcessor";
import { NextPayoutTimer } from "./NextPayoutTimer";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { RecentOperations } from "./RecentOperations";
import { getTerminalInitialData } from "@/modules/terminal/lib/get-terminal-initial-data";

export async function TerminalPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <h1 className="text-display text-white-900">Terminal</h1>
      </div>
    );
  }

  const initialData = await getTerminalInitialData(user.id);

  return (
    <div className="p-4 pb-20 sidebar:pb-4">
      <AutoProfitProcessor />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-2xl text-white-900">
          Your portfolio, <span className="text-white-700">{getUserDisplayName(user)}</span>
        </h1>
        <NextPayoutTimer />
      </div>
      <TerminalTickers userId={user.id} initialData={initialData} />
      <RecentOperations userId={user.id} />
    </div>
  );
}

