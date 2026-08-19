"use client";

import { motion, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const strategies = [
  "Bondex Starter",
  "Bondex Core",
  "Bondex Prime",
  "Bondex Silver",
  "Bondex Alloy",
  "Bondex Momentum",
  "Bondex Gold",
  "Bondex Capital",
  "Bondex Yield",
  "Bondex Apex",
];

const dotCount = 20;
const orbitRadius = 180; // Desktop, will be clamped for mobile
const highlightInterval = 2800; // 2.8 seconds
const orbitDuration = 35; // 35 seconds for full rotation

interface StrategyHybridOrbitProps {
  className?: string;
  headline?: string;
}

// Precompute dot positions once (outside component to avoid hydration mismatch)
// Round values to avoid floating point precision differences between server and client
const dotPositions = Array.from({ length: dotCount }, (_, i) => {
  const angle = (i * 360) / dotCount;
  const radian = (angle * Math.PI) / 180;
  return {
    angle,
    x: Math.round(orbitRadius * Math.cos(radian) * 100) / 100,
    y: Math.round(orbitRadius * Math.sin(radian) * 100) / 100,
  };
});

export function StrategyHybridOrbit({
  className = "",
  headline = "One ecosystem — dozens of Bondex strategies",
}: StrategyHybridOrbitProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3, margin: "100px" });
  const prefersReducedMotion = useReducedMotion();
  const [strategyIndex, setStrategyIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle through strategies
  useEffect(() => {
    if (!mounted || !isInView || prefersReducedMotion) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setStrategyIndex((prev) => (prev + 1) % strategies.length);
    }, highlightInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mounted, isInView, prefersReducedMotion]);

  const activeDotIndex = strategyIndex % dotCount;
  const currentStrategy = strategies[strategyIndex];

  return (
    <section
      ref={sectionRef}
      id="section-4"
      data-section
      className={`h-screen w-full relative bg-surface-900 flex items-center justify-center overflow-hidden ${className}`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Orbit wrapper - rotates */}
        <motion.div
          className="absolute"
          style={{
            width: `${orbitRadius * 2}px`,
            height: `${orbitRadius * 2}px`,
            willChange: "transform",
          }}
          animate={
            isInView && !prefersReducedMotion
              ? {
                  rotate: 360,
                }
              : {}
          }
          transition={{
            rotate: {
              duration: orbitDuration,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {/* Dots */}
          {dotPositions.map((pos, index) => {
            const isActive = mounted && index === activeDotIndex && isInView;
            return (
              <div
                key={index}
                className="absolute rounded-full"
                suppressHydrationWarning
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: "translate(-50%, -50%)",
                  width: mounted && isActive ? "4px" : "3px",
                  height: mounted && isActive ? "4px" : "3px",
                  backgroundColor: "#ffffff",
                  opacity: mounted && isActive ? 0.85 : 0.3,
                  filter: mounted && isActive ? "blur(0.5px)" : "none",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            );
          })}
        </motion.div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Headline */}
          <h2 className="text-white-900 text-2xl md:text-3xl text-center whitespace-nowrap">
            {headline}
          </h2>

          {/* Strategy name container - fixed height to avoid layout shift */}
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {mounted && isInView && (
                <motion.span
                  key={strategyIndex}
                  className="text-white-900 text-sm tracking-wide"
                  style={{ opacity: 0.6 }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 0.65, y: 0 }}
                  exit={{ opacity: 0, y: -2, transition: { duration: 0.35 } }}
                  transition={{
                    duration: 0.45,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {currentStrategy}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

