import { getCurrentUser } from "@/shared/lib/auth";
import { YieldLandingPage } from "@/modules/yield/components/YieldLandingPage";

export default async function YieldPageRoute() {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  
  return <YieldLandingPage isAuthenticated={isAuthenticated} />;
}

