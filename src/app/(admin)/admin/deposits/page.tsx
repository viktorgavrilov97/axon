import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getDepositsAction } from "@/modules/admin/api/get-deposits";
import { DepositsTable } from "./deposits-table";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export default async function AdminDepositsPage({
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
      ? (params.status.toLowerCase() as OxaPayDepositStatus)
      : undefined;

  const result = await getDepositsAction(status, 1, 50);

  if (result?.error) {
    return (
      <div className="p-8">
        <h1 className="text-display mb-8">Deposits</h1>
        <p className="text-body text-redhaze">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <DepositsTable initialDeposits={result.deposits || []} />
    </div>
  );
}

