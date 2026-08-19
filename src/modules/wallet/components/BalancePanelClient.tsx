"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { TopUpDialog } from "./TopUpDialog";
import { WithdrawDialog } from "./WithdrawDialog";
import { WalletSummary } from "../lib/types";
import { useRealtime, isWalletBalanceUpdate } from "@/shared/lib/realtime-context";
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import { useAnimatedValue } from "@/shared/hooks/use-animated-value";

interface BalancePanelClientProps {
  summary: WalletSummary;
}

export function BalancePanelClient({ summary }: BalancePanelClientProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const balanceRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  // Subscribe to realtime updates via shared context (single SSE connection)
  // Router refresh is handled automatically by RealtimeProvider with debouncing
  const { lastUpdate } = useRealtime();

  // Immediately update balance when wallet_balance_updated event is received
  useEffect(() => {
    if (!isWalletBalanceUpdate(lastUpdate)) return;

    const newBalance = Number(lastUpdate.balance);
    console.log("[BalancePanelClient] Processing wallet_balance_updated:", newBalance);

    // Update balance immediately
    balanceRef.current = newBalance;
    hasAnimatedRef.current = true;
  }, [lastUpdate]);

  // Use animated value hook
  const animatedBalance = useAnimatedValue(Number(summary.balance));

  return (
    <>
      <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 mb-6`}>
        {/* Total at the top */}
        <div className="mb-20 flex items-start justify-between">
          <div>
            <p className="text-small text-white-600 mb-2">Total</p>
            <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>
              {animatedBalance.toFixed(2)} USDT
            </p>
          </div>
        </div>

        {/* Available only */}
        <div>
          <p className="text-body text-white-900 mb-1">{animatedBalance.toFixed(2)} USDT</p>
          <p className="text-sm text-white-700 mb-6">Available</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowTopUp(true)}
            className="flex-1"
          >
            Top up balance
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowWithdraw(true)}
            className="flex-1"
          >
            Withdraw
          </Button>
        </div>
      </div>

      {showTopUp && (
        <TopUpDialog
          onClose={() => setShowTopUp(false)}
        />
      )}

      {showWithdraw && (
        <WithdrawDialog
          onClose={() => setShowWithdraw(false)}
        />
      )}
    </>
  );
}

