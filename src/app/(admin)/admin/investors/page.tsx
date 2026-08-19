import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { getUsersAction } from "@/modules/admin/api/get-users";
import { InvestorsTable } from "./investors-table";

export default async function AdminInvestorsPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  const result = await getUsersAction(1, 50);

  if (result?.error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl text-white-900 mb-6">Investors</h1>
        <p className="text-body text-redhaze">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white-900 mb-6">Investors</h1>
      <InvestorsTable initialInvestors={result.users || []} />
    </div>
  );
}

