import { getCurrentUser } from "@/shared/lib/auth";
import { getTotalEarned, getBonusEarned, getTVL } from "@/modules/strategies/lib/strategies-service";
import { getWalletWithSummary } from "@/modules/wallet/lib/wallet-service";
import { db } from "@/shared/lib/db";
import { authedJson } from "@/shared/lib/api/authed-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return authedJson({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalEarned, bonusEarned, tvl, wallet] = await Promise.all([
      getTotalEarned(user.id),
      getBonusEarned(user.id),
      getTVL(user.id),
      getWalletWithSummary(user.id),
    ]);

    const available = wallet.balance;
    const total = available + tvl;
    const withdrawn = 0; // TODO: Calculate from withdrawal history if needed

    // Get active referrals count (users with active strategies)
    const activeReferralsCount = await db.user.count({
      where: {
        referralParentId: user.id,
        strategies: {
          some: {
            status: "ACTIVE",
          },
        },
      },
    });

    return authedJson({
      total,
      tvl,
      available,
      earned: totalEarned,
      bonusEarned,
      withdrawn,
      referralsCount: activeReferralsCount,
    });
  } catch (error) {
    console.error("Error getting metrics:", error);
    return authedJson(
      { error: error instanceof Error ? error.message : "Failed to get metrics" },
      { status: 500 }
    );
  }
}

