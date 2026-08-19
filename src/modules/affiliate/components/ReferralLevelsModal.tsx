"use client";

import { Modal } from "@/shared/ui/modal";
import type { AffiliateDashboard } from "../api/get-dashboard";
import { CompactLevelTags } from "./CompactLevelTags";

interface ReferralLevelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: AffiliateDashboard["levels"];
}

export function ReferralLevelsModal({
  isOpen,
  onClose,
  levels,
}: ReferralLevelsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Referral Levels">
      <div className="space-y-4">
        <p className="text-sm text-white-600">
          Levels 1–3 are always active. Levels 4–14 depend on your turnover.
        </p>
        
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-white-900 mb-2">Always Active (Levels 1-3)</h3>
            <CompactLevelTags levels={levels.filter(l => l.level <= 3)} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-white-900 mb-2">Turnover Required (Levels 4-14)</h3>
            <CompactLevelTags levels={levels.filter(l => l.level > 3)} />
          </div>
        </div>

        <div className="pt-4 border-t border-onsurface-950">
          <p className="text-xs text-white-600">
            <strong className="text-white-900">How it works:</strong> Your turnover (personal active strategies + 1st line referrals' active strategies) determines which levels are unlocked. Only active investments in strategies count, not deposits or wallet balance. Higher turnover unlocks deeper levels and higher percentages.
          </p>
        </div>
      </div>
    </Modal>
  );
}

