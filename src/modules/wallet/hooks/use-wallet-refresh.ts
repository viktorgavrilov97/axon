"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to automatically refresh wallet data when balance changes
 * Uses router.refresh() to re-fetch server components
 */
export function useWalletRefresh(shouldRefresh: boolean, intervalMs: number = 5000) {
  const router = useRouter();
  const [lastBalance, setLastBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!shouldRefresh) return;

    const refreshInterval = setInterval(() => {
      // Refresh server components to get updated balance
      router.refresh();
    }, intervalMs);

    return () => clearInterval(refreshInterval);
  }, [shouldRefresh, intervalMs, router]);
}

