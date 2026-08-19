"use client";

import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import type { AffiliateDashboard } from "../api/get-dashboard";

interface FirstLineListProps {
  referrals: AffiliateDashboard["firstLineReferrals"];
}

export function FirstLineList({ referrals }: FirstLineListProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (referrals.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-heading mb-2">Your 1st line</h2>
        <p className="text-small text-white-600 mb-3">
          Direct partners who registered with your link or code.
        </p>
        <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950 text-center">
          <p className="text-small text-white-600 mb-1">No referrals yet</p>
          <p className="text-xs text-white-600">
            Share your referral link to start building your network
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="text-heading mb-1">Your 1st line</h2>
        <p className="text-small text-white-600">
          Direct partners who registered with your link or code.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {referrals.map((referral) => (
          <div
            key={referral.id}
            className="p-3 bg-surface-800 rounded-lg border border-onsurface-950 relative"
          >
            {/* Active/Inactive Badge */}
            <div className="absolute top-2 right-2">
              <div
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                  referral.active
                    ? "bg-[#A5EACF]/10 text-[#A5EACF] border border-[#A5EACF]"
                    : "bg-onsurface-900 text-white-600 border border-onsurface-950"
                }`}
              >
                {referral.active ? "Active" : "Inactive"}
              </div>
            </div>

            <div className="flex items-start gap-2.5 pr-16">
              <UserAvatar
                user={{
                  id: referral.id,
                  email: referral.email || "",
                  name: referral.name,
                  displayName: referral.displayName,
                  avatarUrl: referral.avatarUrl,
                  avatarColor: referral.avatarColor,
                }}
                size={32}
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-small text-white-900 font-medium mb-1 truncate">
                  {referral.displayName || "Anonymous"}
                </p>
                <p className="text-xs text-white-600 mb-2">
                  Joined: {formatDate(referral.registeredAt)}
                </p>
                <div className="space-y-0.5">
                  <p className="text-xs text-white-600">
                    Personal: <span className="text-white-900">${formatCurrency(referral.personalTurnover)}</span>
                  </p>
                  <p className="text-xs text-white-600">
                    Team: <span className="text-white-900">${formatCurrency(referral.teamTurnover)}</span>
                  </p>
                  <p className="text-xs text-white-600">
                    Levels: <span className="text-white-900">{referral.openedLevelsCount}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
