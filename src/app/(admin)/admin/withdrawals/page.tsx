import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getWithdrawalsAction } from "@/modules/admin/api/get-withdrawals";
import { WithdrawalsTable } from "./withdrawals-table";
import { WithdrawalStatus } from "@prisma/client";

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status.toUpperCase() as WithdrawalStatus)
      : undefined;

  const result = await getWithdrawalsAction(status, 1, 50);

  if (result?.error) {
    return (
      <div className="p-8">
        <h1 className="text-display mb-8">Withdrawals</h1>
        <p className="text-body text-redhaze">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <WithdrawalsTable initialWithdrawals={result.withdrawals || []} />
    </div>
  );
}

