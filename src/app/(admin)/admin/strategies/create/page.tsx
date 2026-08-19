import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { StrategyAdminForm } from "@/modules/strategies/components/StrategyAdminForm";

export default async function AdminCreateStrategyPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-display text-white-900 mb-6">Create Strategy Configuration</h1>
      <StrategyAdminForm />
    </div>
  );
}

