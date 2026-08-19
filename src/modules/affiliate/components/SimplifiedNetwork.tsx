"use client";

import { useState } from "react";
import type { AffiliateDashboard } from "../api/get-dashboard";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { CaretDown, CaretRight, PaperPlaneTilt } from "@phosphor-icons/react";

interface SimplifiedNetworkProps {
  networkLevels: AffiliateDashboard["networkLevels"];
  firstLineReferrals: AffiliateDashboard["firstLineReferrals"];
}

type ReferralItem = AffiliateDashboard["firstLineReferrals"][number];

function ReferralCard({
  referral,
  level = 1,
}: {
  referral: ReferralItem;
  level?: number;
}) {
  const hasChildren = referral.children && referral.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(false); // Don't auto-expand, only expand when user clicks
  
  // Debug logging
  if (process.env.NODE_ENV === "development" && hasChildren) {
    console.log(`[ReferralCard] ${referral.email} has ${referral.children!.length} children, expanded: ${isExpanded}`);
  }

  return (
    <div className="w-full">
      {/* Main referral card */}
      <div
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className={`flex items-center gap-3 p-4 bg-onsurface-950 rounded-xl transition-colors ${
          hasChildren ? "cursor-pointer hover:bg-onsurface-900" : ""
        } ${
          level > 1 ? "" : ""
        }`}
      >
        {/* Expand/collapse button - only show if there are children */}
        {hasChildren ? (
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-white-600">
            {isExpanded ? (
              <CaretDown size={12} weight="bold" />
            ) : (
              <CaretRight size={12} weight="bold" />
            )}
          </div>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}

        <UserAvatar
          user={{
            id: referral.id,
            email: referral.email,
            name: referral.name || null,
            displayName: referral.displayName,
            avatarUrl: referral.avatarUrl,
            avatarColor: referral.avatarColor,
          }}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white-900 truncate">
            {getUserDisplayName({
              email: referral.email,
              name: referral.name,
              displayName: referral.displayName,
            })}
          </p>
          <div className="flex flex-col text-xs text-white-700 mt-0.5 gap-0.5">
            <span>Personal Invested: {referral.personalTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
            <span>Team Invested: {referral.teamTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
            {referral.telegramUsername && (
              <a
                href={`https://t.me/${referral.telegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-white-900 hover:text-white-700 transition-colors mt-1 w-fit"
              >
                <PaperPlaneTilt size={12} weight="regular" />
                <span>@{referral.telegramUsername}</span>
              </a>
            )}
          </div>
        </div>
        <div
          className={`px-2 py-0.5 rounded-full text-xs ${
            referral.active
              ? "bg-[#A5EACF]/20 text-[#A5EACF]"
              : "bg-onsurface-900 text-white-600"
          }`}
        >
          {referral.active ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Children (nested referrals) - only show if there are children AND user expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-onsurface-950">
          {referral.children!.map((child) => (
            <ReferralCard key={child.id} referral={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SimplifiedNetwork({
  networkLevels,
  firstLineReferrals,
}: SimplifiedNetworkProps) {
  // Check if there are any partners
  const hasPartners = firstLineReferrals.length > 0;

  // If no partners
  if (!hasPartners) {
    return (
      <div className="p-6 bg-onsurface-900 rounded-xl text-center">
        <p className="text-body text-white-700">
          No partners yet. Share your link to build your network.
        </p>
      </div>
    );
  }

  // Show tree structure
  return (
    <div className="space-y-2">
      {firstLineReferrals.map((referral) => (
        <ReferralCard key={referral.id} referral={referral} level={1} />
      ))}
    </div>
  );
}

