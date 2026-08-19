"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Logo3D } from "./Logo3D";

export function AnimatedHeader() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const setHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-h", `${height}px`);
      }
    };

    // Set initial height
    setHeaderHeight();

    // Update on resize (in case header height changes)
    window.addEventListener("resize", setHeaderHeight);

    // Use ResizeObserver for more accurate tracking
    if (headerRef.current) {
      const resizeObserver = new ResizeObserver(setHeaderHeight);
      resizeObserver.observe(headerRef.current);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", setHeaderHeight);
      };
    }

    return () => {
      window.removeEventListener("resize", setHeaderHeight);
    };
  }, []);

  return (
    <motion.header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 w-full z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.2,
      }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Логотип слева */}
        <Link href="/" className="flex items-center gap-4">
          <Logo3D />
        </Link>
        
        {/* Кнопка Login справа */}
        <Link href="/auth/email">
          <Button variant="ghost" size="sm" className="border border-onsurface-800 bg-transparent text-white-900 hover:bg-onsurface-800">Login</Button>
        </Link>
      </div>
    </motion.header>
  );
}


