import { getAffiliateDashboard, type AffiliateDashboard } from "../api/get-dashboard";
import { AffiliateDashboardClient } from "./AffiliateDashboardClient";

export async function AffiliateDashboard() {
  const result = await getAffiliateDashboard();

  if ("error" in result) {
    return (
      <div className="p-4">
        <div className="p-4 bg-surface-800 border border-redhaze text-redhaze text-body rounded">
          {result.error}
        </div>
      </div>
    );
  }

  const data: AffiliateDashboard = result;

  return <AffiliateDashboardClient data={data} />;
}

