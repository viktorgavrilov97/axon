"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to subscribe to realtime deposit updates via SSE
 * Automatically refreshes the router when deposit status changes
 */
export function useDepositRealtime() {
  const router = useRouter();

  useEffect(() => {
    console.log("[Realtime] Initializing EventSource connection...");
    
    // Create EventSource connection
    const eventSource = new EventSource("/api/realtime/terminal");

    // Handle connection opened
    eventSource.onopen = () => {
      console.log("[Realtime] EventSource connection opened");
    };

    // Handle all realtime events
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle handshake
        if (data.type === "connected") {
          console.log("[Realtime] Connected to terminal stream");
          return;
        }
        
        // Handle keepalive
        if (data.type === "keepalive") {
          return;
        }
        
        // Handle deposit status updates, wallet balance updates, and operations
        if (
          data.type === "deposit_status_updated" ||
          data.type === "wallet_balance_updated" ||
          data.type === "operation_created"
        ) {
          console.log("[Realtime] Event received:", data.type);
          
          // Refresh router to get latest data from server
          router.refresh();
        }
      } catch (e) {
        console.error("[Realtime] Failed to handle event:", e);
      }
    };


    // Handle errors
    eventSource.addEventListener("error", (err) => {
      console.error("[Realtime] SSE error:", err);
      console.error("[Realtime] EventSource readyState:", eventSource.readyState);
      // EventSource will automatically try to reconnect
      // If connection fails completely, it will close
    });

    // Log connection state
    console.log("[Realtime] EventSource created, readyState:", eventSource.readyState);

    // Cleanup on unmount
    return () => {
      console.log("[Realtime] Closing EventSource connection");
      eventSource.close();
    };
  }, [router]);
}

