"use client";

import { motion } from "framer-motion";

export function BondexSystemSection() {
  return (
    <section
      id="section-4"
      data-section
      className="h-screen w-full relative bg-surface-900 flex items-center justify-center"
    >
      <div className="relative flex flex-col items-center gap-4" style={{ marginTop: '-80px' }}>
        <motion.span
          className="text-white-900 text-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ amount: 0.3, once: false }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.4,
          }}
        >
          One ecosystem — dozens of Bondex strategies
        </motion.span>
      </div>
    </section>
  );
}
