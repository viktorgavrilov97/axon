import { authedJson } from "@/shared/lib/api/authed-response";
import { getServerSession } from "@/shared/lib/auth";
import { getUserOperationsPaginated } from "@/modules/operations/lib/operations-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return authedJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const typeFilter = searchParams.get("type") as "all" | "deposit" | "withdrawal" | "strategy_investment" | "referral_payout" | null;
  const limit = limitParam ? Math.min(Number(limitParam) || 10, 50) : 10;

  try {
    const result = await getUserOperationsPaginated({
      userId: session.user.id,
      cursor: cursor || null,
      limit,
      typeFilter: typeFilter || "all",
    });

    return authedJson({
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Error fetching paginated operations:", error);
    return authedJson({ error: "Internal Server Error" }, { status: 500 });
  }
}

