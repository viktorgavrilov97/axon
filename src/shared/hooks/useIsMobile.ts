"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the current device is mobile (screen width < 768px)
 * Returns true for mobile devices, false for desktop
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Return false during SSR to avoid hydration mismatch
  return mounted ? isMobile : false;
}
