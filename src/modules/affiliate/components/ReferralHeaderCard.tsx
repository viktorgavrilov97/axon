"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ReferralHeaderCardProps {
  referralLink: string;
  referralCode: string;
  statusBadge: "Starter" | "Builder" | "Leader";
}

export function ReferralHeaderCard({
  referralLink,
  referralCode,
  statusBadge,
}: ReferralHeaderCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const badgeColors = {
    Starter: "bg-[#A5EACF]/10 text-[#A5EACF] border-[#A5EACF]",
    Builder: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]",
    Leader: "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]",
  };

  return (
    <div className="w-full bg-surface-800 rounded-lg border border-onsurface-950 p-4">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Left side: Referral Code & Link */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="text-small text-white-600 mb-1.5 block">
              Referral Code
            </label>
            <div className="p-2.5 bg-onsurface-900 rounded border border-onsurface-950 overflow-x-auto">
              <p className="text-small text-white-900 font-mono whitespace-nowrap">{referralCode}</p>
            </div>
          </div>
          <div>
            <label className="text-small text-white-600 mb-1.5 block">
              Referral Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 p-2.5 bg-onsurface-900 rounded border border-onsurface-950 overflow-x-auto">
                <p className="text-small text-white-900 break-all">{referralLink}</p>
              </div>
              <Button
                onClick={handleCopy}
                variant="secondary"
                size="sm"
                className="flex-shrink-0"
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Right side: How it works */}
        <div className="flex-1 md:max-w-xs">
          <div className="p-3 bg-onsurface-900 rounded border border-onsurface-950">
            <h3 className="text-heading mb-2 text-sm">How it works</h3>
            <ul className="space-y-1.5 text-small text-white-600">
              <li className="flex items-start gap-1.5">
                <span className="text-white-900 mt-0.5 flex-shrink-0">•</span>
                <span>Share your personal link or code</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-white-900 mt-0.5 flex-shrink-0">•</span>
                <span>Your partners invest in strategies</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-white-900 mt-0.5 flex-shrink-0">•</span>
                <span>You earn a percentage of their daily profit up to 14 levels</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex justify-end">
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-small border ${badgeColors[statusBadge]}`}
        >
          {statusBadge}
        </div>
      </div>
    </div>
  );
}
