"use client";

import { useEffect, useState } from "react";

const MIN_DURATION_MS = 1000;

const messages = [
  "Initializing core",
];

function pickRandomMessage(): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Hook to manage initial preloader visibility and message.
 * 
 * Behavior:
 * - Shows on initial load and hard reload (including cached)
 * - Hides when DOM is ready + fonts loaded + min duration elapsed
 * - Does NOT show on BFCache restore or client-side navigation
 * - Message is randomly selected once per page load (stable across renders)
 * 
 * @returns { visible: boolean; message: string } - Preloader state
 */
export function useInitialPreloader() {
  const [visible, setVisible] = useState(true);
  // Pick message once per page load, only on client to avoid hydration mismatch
  const [message, setMessage] = useState("Starting Axon");

  // Generate random message only on client after mount
  useEffect(() => {
    setMessage(pickRandomMessage());
  }, []);

  useEffect(() => {
    let minTimerId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const hidePreloader = () => {
      if (isCleanedUp) return;
      setVisible(false);
    };

    const checkReady = async () => {
      // Start minimum duration timer
      const minTimerPromise = new Promise<void>((resolve) => {
        minTimerId = setTimeout(() => {
          resolve();
        }, MIN_DURATION_MS);
      });

      // Wait for window load event
      const loadPromise = new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          window.addEventListener("load", () => resolve(), { once: true });
        }
      });

      // Wait for fonts if supported
      const fontsPromise = new Promise<void>((resolve) => {
        if (typeof document !== "undefined" && document.fonts?.ready) {
          document.fonts.ready
            .then(() => resolve())
            .catch(() => resolve());
        } else {
          resolve();
        }
      });

      // Wait for all conditions
      await Promise.all([minTimerPromise, loadPromise, fontsPromise]);

      if (!isCleanedUp) {
        hidePreloader();
      }
    };

    // Handle BFCache (back/forward cache) restore
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setVisible(false);
        isCleanedUp = true;
        if (minTimerId) {
          clearTimeout(minTimerId);
        }
        return;
      }
    };

    // Check if page was loaded from BFCache immediately
    const navEntry =
      typeof window !== "undefined"
        ? (window.performance?.getEntriesByType?.("navigation")?.[0] as
            | PerformanceNavigationTiming
            | undefined)
        : undefined;

    const isBFCacheRestore = navEntry?.type === "back_forward";

    // Listen for pageshow event (BFCache detection)
    window.addEventListener("pageshow", handlePageShow);

    if (isBFCacheRestore) {
      setVisible(false);
      isCleanedUp = true;
    } else {
      checkReady();
    }

    return () => {
      isCleanedUp = true;
      window.removeEventListener("pageshow", handlePageShow);
      if (minTimerId) {
        clearTimeout(minTimerId);
      }
    };
  }, []);

  return { visible, message };
}

