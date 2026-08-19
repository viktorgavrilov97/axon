"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface CompactReferralLinkProps {
  referralLink: string;
  referralCode: string;
  totalReferralsCount: number;
  activeReferralsCount: number;
}

export function CompactReferralLink({
  referralLink,
  referralCode,
  totalReferralsCount,
  activeReferralsCount,
}: CompactReferralLinkProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success("Link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success("Code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Total and Active Referrals Tickers */}
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-caption text-white-600 mb-3">Total referrals</p>
          <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>
            {totalReferralsCount}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-caption text-white-600 mb-3">Active referrals</p>
          <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>
            {activeReferralsCount}
          </p>
        </div>
      </div>

      {/* Link, Code and Description */}
      <div className="space-y-4 mt-6 sm:mt-8">
        <div className="flex items-center gap-2">
        <div className="flex-1 py-2.5 px-3 bg-onsurface-800 rounded-xl">
          <p className="text-body text-white-900 break-all">{referralLink}</p>
        </div>
        <Button
          onClick={handleCopyLink}
          variant="secondary"
          size="sm"
          className="flex-shrink-0 w-[104px] sm:w-[120px]"
        >
          {copiedLink ? (
            <>
              <IconCheck size={14} />
              <span className="ml-1 text-xs">Copied</span>
            </>
          ) : (
            <>
              <IconCopy size={14} />
              <span className="ml-1 text-xs">Copy link</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 py-2.5 px-3 bg-onsurface-800 rounded-xl">
          <p className="text-body text-white-900 font-mono">{referralCode}</p>
        </div>
        <Button
          onClick={handleCopyCode}
          variant="secondary"
          size="sm"
          className="flex-shrink-0 w-[104px] sm:w-[120px]"
        >
          {copiedCode ? (
            <>
              <IconCheck size={14} />
              <span className="ml-1 text-xs">Copied</span>
            </>
          ) : (
            <>
              <IconCopy size={14} />
              <span className="ml-1 text-xs">Copy code</span>
            </>
          )}
        </Button>
      </div>

        <p className="text-small text-white-600">
          Earn up to 14 levels deep by sharing your link.
        </p>
      </div>
    </div>
  );
}

