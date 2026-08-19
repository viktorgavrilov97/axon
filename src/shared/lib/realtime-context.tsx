"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

interface DepositUpdateEvent {
  type: "deposit_update";
  depositId: string;
  status: OxaPayDepositStatus;
  providerStatus: string | null;
  createdAt: string;
  confirmedAt: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
  txStatus?: string | null;
}

interface WalletBalanceUpdateEvent {
  type: "wallet_balance_update";
  walletId: string;
  balance: string;
}

type RealtimeUpdateEvent = DepositUpdateEvent | WalletBalanceUpdateEvent;

interface RealtimeContextValue {
  isConnected: boolean;
  lastUpdate: RealtimeUpdateEvent | null;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Debounced router refresh utility
 * Prevents multiple refresh calls in quick succession
 */
let refreshTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 500;

function debouncedRefresh(router: ReturnType<typeof useRouter>) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  refreshTimeout = setTimeout(() => {
    router.refresh();
    refreshTimeout = null;
  }, DEBOUNCE_MS);
}

/**
 * RealtimeProvider - Single SSE connection for the entire app/page
 * All components should use useRealtime() hook instead of creating their own EventSource
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdateEvent | null>(null);

  useEffect(() => {
    console.log("[RealtimeProvider] Initializing single EventSource connection...");
    
    // Create single EventSource connection
    const eventSource = new EventSource("/api/realtime/terminal");

    // Handle connection opened
    eventSource.onopen = () => {
      console.log("[RealtimeProvider] EventSource connection opened");
      setIsConnected(true);
    };

    // Handle all realtime events
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle handshake
        if (data.type === "connected") {
          console.log("[RealtimeProvider] Connected to terminal stream");
          return;
        }
        
        // Handle keepalive
        if (data.type === "keepalive") {
          return;
        }
        
        // Handle deposit status updates
        if (data.type === "deposit_status_updated") {
          console.log("[RealtimeProvider] deposit_status_updated received:", data);
          setLastUpdate({
            type: "deposit_update",
            depositId: data.depositId,
            status: data.status,
            providerStatus: data.providerStatus || null,
            createdAt: data.timestamp,
            confirmedAt: data.confirmedAt || null,
            confirmations: data.confirmations || null,
            requiredConfirmations: data.requiredConfirmations || null,
            txStatus: data.txStatus || null,
          });
        }
        
        // Handle wallet balance updates
        if (data.type === "wallet_balance_updated") {
          console.log("[RealtimeProvider] wallet_balance_updated received:", data);
          setLastUpdate({
            type: "wallet_balance_update",
            walletId: data.walletId,
            balance: data.balance,
          });
        }
        
        // Handle operation created
        if (data.type === "operation_created") {
          console.log("[RealtimeProvider] operation_created received:", data);
        }
        
        // Handle affiliate payout created
        if (data.type === "affiliate_payout_created") {
          console.log("[RealtimeProvider] affiliate_payout_created received:", data);
        }
        
        // Debounced refresh to avoid multiple refreshes
        debouncedRefresh(router);
      } catch (e) {
        console.error("[RealtimeProvider] Failed to handle event:", e);
      }
    };

    // Handle connection established
    eventSource.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        console.log("[RealtimeProvider] Connected:", data);
        setIsConnected(true);
      } catch (e) {
        console.error("[RealtimeProvider] Failed to parse connected event:", e);
      }
    });

    // Handle keepalive
    eventSource.addEventListener("keepalive", () => {
      // Silent keepalive - no need to log
    });

    // Handle errors
    eventSource.addEventListener("error", (err) => {
      console.error("[RealtimeProvider] SSE error:", err);
      setIsConnected(false);
      // EventSource will automatically try to reconnect
    });

    // Cleanup on unmount
    return () => {
      console.log("[RealtimeProvider] Closing EventSource connection");
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
      eventSource.close();
    };
  }, [router]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access realtime updates
 * Use this instead of creating your own EventSource
 */
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    // If not wrapped in RealtimeProvider, return default values
    // This allows components to work even without provider (graceful degradation)
    return { isConnected: false, lastUpdate: null };
  }
  return context;
}

// Type guard helpers
export function isDepositUpdate(event: RealtimeUpdateEvent | null): event is DepositUpdateEvent {
  return event?.type === "deposit_update";
}

export function isWalletBalanceUpdate(event: RealtimeUpdateEvent | null): event is WalletBalanceUpdateEvent {
  return event?.type === "wallet_balance_update";
}

