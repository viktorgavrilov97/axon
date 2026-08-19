import { getCurrentUser } from "@/shared/lib/auth";
import { ReferralLevelsLandingPage } from "@/modules/referral-levels/components/ReferralLevelsLandingPage";

export default async function ReferralLevelsPageRoute() {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  
  return <ReferralLevelsLandingPage isAuthenticated={isAuthenticated} />;
}

