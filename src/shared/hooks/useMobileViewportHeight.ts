"use client";

import { useEffect } from "react";

/**
 * Hook to set CSS variable --app-vh for dynamic viewport height
 * This fixes issues with mobile browsers where 100vh doesn't account for
 * dynamic browser UI (address bar, navigation bar)
 */
export function useMobileViewportHeight() {
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    };

    // Set initial value
    setVH();

    // Update on resize and orientation change
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);
}
