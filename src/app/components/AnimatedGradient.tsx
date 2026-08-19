"use client";

import { motion } from "framer-motion";

/**
 * Анимированный градиент под шапкой.
 * Появляется с задержкой после анимации логотипа и кнопки Login.
 */
export function AnimatedGradient() {
  return (
    <motion.div
      className="fixed left-0 right-0 w-full h-52 z-40 pointer-events-none"
      style={{
        top: '-195px',
        background: 'linear-gradient(to bottom, #fff 0%, rgba(0, 0, 0, 0) 100%)',
        willChange: 'opacity, transform',
      }}
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        delay: 1.0, // После анимации шапки (delay 0.2 + duration 0.8)
      }}
    />
  );
}

