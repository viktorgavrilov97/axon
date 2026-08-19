"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

export function EcosystemSection() {
  const leftTheses = [
    {
      title: "Unified Engine",
      text: "Single algorithmic infrastructure powers all three strategies with consistent execution logic.",
    },
    {
      title: "Risk Profiles",
      text: "Each strategy applies distinct risk management parameters while sharing the same oversight framework.",
    },
  ];

  const rightTheses = [
    {
      title: "Capital Allocation",
      text: "Strategies distribute capital across different market segments using the same underlying engine.",
    },
    {
      title: "Real-time Oversight",
      text: "All strategies operate under unified monitoring and adjustment systems for consistent performance.",
    },
  ];

  return (
    <section className="relative py-24 px-6 bg-surface-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.3, once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white-900 leading-tight tracking-tight mb-4">
            One system. Three capital behaviors.
          </h2>
          <p className="text-lg md:text-xl text-white-600 max-w-2xl mx-auto">
            Single infrastructure — multiple profit logics
          </p>
        </motion.div>

        {/* Two Column Theses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16">
          {/* Left Column */}
          <div className="space-y-8">
            {leftTheses.map((thesis, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: true }}
                transition={{
                  duration: 0.4,
                  delay: 0.1 + idx * 0.1,
                  ease: "easeOut",
                }}
                className="border-b border-onsurface-800 pb-8 last:border-b-0 last:pb-0"
              >
                <h3 className="text-lg font-semibold text-white-900 mb-2">
                  {thesis.title}
                </h3>
                <p className="text-base text-white-600 leading-relaxed">
                  {thesis.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-onsurface-800" />

          {/* Right Column */}
          <div className="space-y-8">
            {rightTheses.map((thesis, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: true }}
                transition={{
                  duration: 0.4,
                  delay: 0.3 + idx * 0.1,
                  ease: "easeOut",
                }}
                className="border-b border-onsurface-800 pb-8 last:border-b-0 last:pb-0"
              >
                <h3 className="text-lg font-semibold text-white-900 mb-2">
                  {thesis.title}
                </h3>
                <p className="text-base text-white-600 leading-relaxed">
                  {thesis.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.3, once: true }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <Link
            href="#section-4"
            className="inline-flex items-center gap-2 text-white-900 hover:text-white-700 underline transition-colors text-lg font-medium"
          >
            View strategies
            <ArrowRight size={18} weight="regular" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

