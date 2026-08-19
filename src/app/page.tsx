"use client";

import { useState, useEffect } from "react";
import { SectionScrollContainer } from "./components/SectionScrollContainer";
import { LandingSections } from "./components/LandingSections";
import { MobileLandingSections } from "./components/mobile/MobileLandingSections";
import { AnimatedHeader } from "./components/AnimatedHeader";
import { AnimatedGradient } from "./components/AnimatedGradient";

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // During SSR, render desktop version to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen">
        <AnimatedGradient />
        <AnimatedHeader />
        <SectionScrollContainer headerOffsetPx={80} durationMs={650}>
          <LandingSections />
        </SectionScrollContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Background gradient с анимацией */}
      <AnimatedGradient />
      
      {/* Фиксированный хедер с анимацией */}
      <AnimatedHeader />
      
      {/* Условный рендеринг: мобильная или десктопная версия */}
      {isMobile ? (
        <div className="pt-16">
          <MobileLandingSections />
        </div>
      ) : (
        <SectionScrollContainer headerOffsetPx={80} durationMs={650}>
          <LandingSections />
        </SectionScrollContainer>
      )}
    </div>
  );
}


