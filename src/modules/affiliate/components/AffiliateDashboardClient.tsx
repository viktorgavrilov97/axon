"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AffiliateDashboard } from "../api/get-dashboard";
import { CompactReferralLink } from "./CompactReferralLink";
import { CompactProgressBar } from "./CompactProgressBar";
import { SimplifiedNetwork } from "./SimplifiedNetwork";
import { ReferralOperationsList } from "./ReferralOperationsList";
import { ReferralEarnedChart } from "./ReferralEarnedChart";
import { isTestMode } from "@/shared/lib/env";

interface AffiliateDashboardClientProps {
  data: AffiliateDashboard;
}

export function AffiliateDashboardClient({ data: initialData }: AffiliateDashboardClientProps) {
  const router = useRouter();

  // Log environment info (client-side)
  useEffect(() => {
    console.log("Environment:", process.env.NEXT_PUBLIC_VERCEL_ENV);
    console.log("Test mode:", isTestMode());
  }, []);

  // Subscribe to realtime updates for affiliate payouts
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle affiliate payout created
        if (data.type === "affiliate_payout_created") {
          console.log("[AffiliateDashboard] affiliate_payout_created received, refreshing...");
          // Small delay to ensure DB transaction is committed
          setTimeout(() => {
            router.refresh();
          }, 100);
        }
        
        // Also handle operation_created for referral_payout
        if (data.type === "operation_created" && data.operationType === "referral_payout") {
          console.log("[AffiliateDashboard] referral_payout operation created, refreshing...");
          setTimeout(() => {
            router.refresh();
          }, 100);
        }
        
        // Handle wallet balance updates
        if (data.type === "wallet_balance_updated") {
          console.log("[AffiliateDashboard] wallet_balance_updated received, refreshing...");
          setTimeout(() => {
            router.refresh();
          }, 100);
        }
      } catch (e) {
        console.error("[AffiliateDashboard] Failed to handle event:", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  const maxOpenedLevel = initialData.openedLevels.length > 0 
    ? Math.max(...initialData.openedLevels) 
    : 0;

  return (
    <div className="p-4 pb-20 sidebar:pb-4">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl text-white-900">Affiliate Program</h1>
      </div>

      {/* Referral Link & Code + Level & Turnover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Referral Link & Code */}
        <div className="p-4 sm:p-6 bg-onsurface-900 rounded-xl">
          <CompactReferralLink
            referralLink={initialData.referralLink}
            referralCode={initialData.referralCode}
            totalReferralsCount={initialData.totalReferralsCount}
            activeReferralsCount={initialData.activeReferralsCount}
          />
        </div>

        {/* Level & Turnover */}
        <div className="p-4 sm:p-6 bg-onsurface-900 rounded-xl">
          <CompactProgressBar
            turnover={initialData.turnover}
            nextLevelTurnover={initialData.nextLevelTurnover}
            currentLevel={maxOpenedLevel}
            levels={initialData.levels}
          />
        </div>
      </div>

      {/* Earned Chart */}
      <div className="mt-4">
        <ReferralEarnedChart />
      </div>

      {/* Network Overview - Simplified */}
      <div className="mt-4 p-4 sm:p-6 bg-onsurface-900 rounded-xl">
        <h2 className="text-lg text-white-900 mb-4 sm:mb-6">Network Overview</h2>
        <SimplifiedNetwork
          networkLevels={initialData.networkLevels}
          firstLineReferrals={initialData.firstLineReferrals}
        />
      </div>

      {/* Recent Payouts */}
      <div className="mt-6 sm:mt-8">
        <ReferralOperationsList />
      </div>
    </div>
  );
}
