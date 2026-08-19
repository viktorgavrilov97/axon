"use client";

import { StrategyConfigData } from "../lib/strategies-types";
import { Button } from "@/shared/ui/button";
import { useState } from "react";
import { InvestDialog } from "./InvestDialog";

interface StrategyConfigCardProps {
  config: StrategyConfigData;
  hasActiveInvestment?: boolean; // Whether user already has an active investment in this strategy
  onInvest: () => void;
}

export function StrategyConfigCard({ config, hasActiveInvestment = false, onInvest }: StrategyConfigCardProps) {
  const [showInvestDialog, setShowInvestDialog] = useState(false);

  return (
    <div className={`p-6 bg-onsurface-900 rounded-xl ${hasActiveInvestment ? 'opacity-60' : ''}`}>
      {/* Accent color line at the top */}
      {config.accentColor && (
        <div 
          className="mb-40"
          style={{ 
            backgroundColor: config.accentColor,
            height: '4px'
          }}
        />
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg text-white-900">{config.name}</h3>
            {hasActiveInvestment && (
              <span className="px-2 py-1 text-xs bg-onsurface-800 text-white-600 rounded">
                Active
              </span>
            )}
          </div>
          {config.description && (
            <p className="text-small text-white-600 mb-2">{config.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-10">
        <div className="flex items-center justify-between">
          <p className="text-small text-white-600">Minimum deposit</p>
          <p className="text-body text-white-900">
            {config.minAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-small text-white-600">Maximum deposit</p>
          <p className="text-body text-white-900">
            {config.maxAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-small text-white-600">Term</p>
          <p className="text-body text-white-900">
            {config.minDays} - {config.maxDays} days
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-small text-white-600">Percent</p>
          <p className="text-body text-white-900">
            {config.baseMinPercent.toFixed(2)}% - {config.baseMaxPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {hasActiveInvestment ? (
        <div className="w-full py-3 px-4 text-center text-body text-white-600 bg-onsurface-800 rounded-lg">
          Already invested
        </div>
      ) : (
        <Button
          onClick={() => setShowInvestDialog(true)}
          className="w-full"
        >
          Invest Now
        </Button>
      )}

      {showInvestDialog && (
        <InvestDialog
          config={config}
          onClose={() => setShowInvestDialog(false)}
          onSuccess={onInvest}
        />
      )}
    </div>
  );
}

