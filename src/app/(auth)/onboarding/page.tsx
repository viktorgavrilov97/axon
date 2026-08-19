import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { cookies } from "next/headers";
import OnboardingForm from "@/modules/identity/components/OnboardingForm";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      displayName: true,
      hasCompletedOnboarding: true,
      email: true,
      name: true,
      referralParentId: true,
      referralParent: {
        select: {
          referralCode: true,
          displayName: true,
        },
      },
    },
  });

  if (!userData) {
    redirect("/login");
  }

  if (userData.displayName && userData.hasCompletedOnboarding) {
    redirect("/terminal");
  }

  const initialDisplayName =
    userData.displayName ??
    userData.name ??
    userData.email?.split("@")[0] ??
    "";

  const hasReferralParent = !!userData.referralParentId;
  let referralParentCode = userData.referralParent?.referralCode || null;
  const referralParentDisplayName = userData.referralParent?.displayName || null;
  
  // If referral code is not loaded from DB (either no parent or relation failed to load),
  // try to use code from cookie
  // Note: We can only READ cookies in Server Components, not modify them
  // Cookie will be cleared in updateProfileAction after successful onboarding
  if (!referralParentCode) {
    const cookieStore = await cookies();
    const pendingReferralCode = cookieStore.get("pending_referral_code")?.value;
    
    if (pendingReferralCode) {
      // Verify the code exists in DB
      const parentUser = await db.user.findUnique({
        where: { referralCode: pendingReferralCode },
        select: { referralCode: true, displayName: true },
      });
      if (parentUser) {
        referralParentCode = parentUser.referralCode;
        console.log("[Onboarding] Using referral code from cookie:", referralParentCode);
      }
      // If code is invalid, it will expire automatically (maxAge: 15 minutes)
      // and will be cleared in updateProfileAction after onboarding
    }
  }
  
  // Debug: Log to help diagnose referral parent loading issues
  if (process.env.NODE_ENV === "development") {
    console.log("[Onboarding] User data:", {
      userId: userData.id,
      referralParentId: userData.referralParentId,
      hasReferralParent,
      referralParentCode,
      referralParentDisplayName,
      referralParent: userData.referralParent,
    });
  }

  return (
    <OnboardingForm
      initialDisplayName={initialDisplayName}
      hasReferralParent={hasReferralParent}
      referralParentCode={referralParentCode}
      referralParentDisplayName={referralParentDisplayName}
    />
  );
}

