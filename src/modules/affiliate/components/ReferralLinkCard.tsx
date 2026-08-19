"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ReferralLinkCardProps {
  referralLink: string;
  referralCode: string;
}

export function ReferralLinkCard({
  referralLink,
  referralCode,
}: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="bg-surface-800 rounded-lg border border-onsurface-950 p-5">
      <div className="flex flex-col md:flex-row md:items-start gap-5">
        {/* Left: Referral Code & Link */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="text-small text-white-600 mb-2 block">
              Your Referral Code
            </label>
            <div className="p-3 bg-onsurface-900 rounded border border-onsurface-950">
              <p className="text-body text-white-900 font-mono">{referralCode}</p>
            </div>
          </div>
          <div>
            <label className="text-small text-white-600 mb-2 block">
              Your Referral Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-onsurface-900 rounded border border-onsurface-950 overflow-x-auto">
                <p className="text-small text-white-900 break-all">{referralLink}</p>
              </div>
              <Button
                onClick={handleCopy}
                variant="secondary"
                size="sm"
                className="flex-shrink-0"
              >
                {copied ? (
                  <>
                    <IconCheck size={16} />
                    <span className="ml-1.5">Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={16} />
                    <span className="ml-1.5">Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: How it works */}
        <div className="md:w-80 flex-shrink-0">
          <div className="p-4 bg-onsurface-900 rounded border border-onsurface-950">
            <h3 className="text-heading mb-3 text-sm font-medium">How it works</h3>
            <ul className="space-y-2.5 text-small text-white-600">
              <li className="flex items-start gap-2">
                <span className="text-[#A5EACF] mt-0.5 flex-shrink-0">•</span>
                <span>Share your personal link or code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A5EACF] mt-0.5 flex-shrink-0">•</span>
                <span>Your partners invest in strategies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A5EACF] mt-0.5 flex-shrink-0">•</span>
                <span>You earn a percentage of their daily profit up to 14 levels</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

