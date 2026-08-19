"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface InitialPreloaderProps {
  visible: boolean;
  message: string;
}

/**
 * Apple-style initial preloader with breathing dot and status message.
 * 
 * QA Notes:
 * - Verify: Hard refresh shows loader
 * - Verify: Normal in-app navigation doesn't show
 * - Verify: Back/forward BFCache doesn't show loader
 * - Verify: Reduced motion shows static dot
 */
export function InitialPreloader({ visible, message }: InitialPreloaderProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Keep component mounted until fade-out completes
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <motion.div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[9999] bg-surface-900 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Breathing dot */}
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
          }}
          animate={
            prefersReducedMotion
              ? {
                  opacity: 0.8,
                  scale: 1,
                }
              : {
                  scale: [0.92, 1.0, 0.92],
                  opacity: [0.55, 0.95, 0.55],
                }
          }
          transition={
            prefersReducedMotion
              ? {}
              : {
                  duration: 1.8,
                  ease: [0.4, 0, 0.2, 1],
                  repeat: Infinity,
                }
          }
        />
        {/* Status message */}
        <motion.p
          className="text-sm text-white-900 mt-10"
          style={{
            opacity: 0.45,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 0.45 : 0 }}
          transition={{
            duration: 0.3,
            delay: 0.1,
          }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}

