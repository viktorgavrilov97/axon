import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  // Only SUPERADMIN can manage integrations
  if (user.role !== "SUPERADMIN") {
    redirect("/admin");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-white-900">Integrations</h1>
      </div>

      <IntegrationsClient />
    </div>
  );
}

