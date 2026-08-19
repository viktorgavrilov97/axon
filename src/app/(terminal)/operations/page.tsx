import { getServerSession } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getUserOperationsPaginated } from "@/modules/operations/lib/operations-service";
import { OperationsListInfinite } from "@/modules/operations/components/OperationsListInfinite";
import { AutoProfitProcessor } from "@/modules/strategies/components/AutoProfitProcessor";

// Force dynamic rendering for realtime updates
export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/auth/email");
  }

  // Get first page of operations (10 items)
  const { items, nextCursor, hasMore } = await getUserOperationsPaginated({
    userId: session.user.id,
    limit: 10,
  });

  return (
    <div className="p-4">
      <AutoProfitProcessor />
      <div className="mb-6">
        <OperationsListInfinite
          initialItems={items}
          initialNextCursor={nextCursor}
          initialHasMore={hasMore}
        />
      </div>
    </div>
  );
}

