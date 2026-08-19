"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  icon: string;
  titleTextColor: string;
  yieldRange: string;
}

const strategies: Strategy[] = [
  {
    id: "macro",
    name: "Bondex Macro",
    description: "Global trends, macroeconomic cycles and algorithmic solutions.",
    icon: "/strategies/macro.svg",
    titleTextColor: "#FFFFFF",
    yieldRange: "0.90% - 1.80%",
  },
  {
    id: "crypto",
    name: "Bondex Crypto",
    description: "Dynamics of digital capital and high volatility under control.",
    icon: "/strategies/crypto.svg",
    titleTextColor: "#C0C5FC",
    yieldRange: "1.20% - 2.00%",
  },
  {
    id: "gold",
    name: "Bondex Gold",
    description: "Stability and confidence of classic assets.",
    icon: "/strategies/gold.svg",
    titleTextColor: "#FCF1C0",
    yieldRange: "1.60% - 3.20%",
  },
];

export function MobileStrategySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });

  return (
    <section 
      ref={sectionRef} 
      className="relative py-20 px-4 overflow-hidden bg-black"
    >
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: isInView ? 0.2 : 0,
          }}
        >
          <h2 className="text-xl text-white leading-tight tracking-normal">
            Core Bondex Strategies
          </h2>
        </motion.div>

        {/* Strategies - Static Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {strategies.map((strategy, index) => (
            <motion.div
              key={strategy.id}
              className="relative bg-surface-800 rounded-[32px] flex flex-col items-center text-center h-[80vh] min-h-[400px] p-6"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                delay: isInView ? 0.4 + index * 0.15 : 0,
              }}
            >
              {/* Top Spacer */}
              <div className="flex-1" />

              {/* Icon */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isInView ? 0.5 + index * 0.15 : 0,
                }}
              >
                <Image
                  src={strategy.icon}
                  alt={strategy.name}
                  width={44}
                  height={44}
                  className="h-[44px] w-auto"
                />
              </motion.div>

              {/* Title */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isInView ? 0.6 + index * 0.15 : 0,
                }}
              >
                <h3
                  className="text-2xl font-medium tracking-tight"
                  style={{
                    color: strategy.id === "crypto" 
                      ? "#C0C5FC" 
                      : strategy.id === "gold" 
                      ? "#FCF1C0" 
                      : "#FFFFFF",
                  }}
                >
                  {strategy.name}
                </h3>
              </motion.div>

              {/* Description */}
              <motion.p
                className="text-white-700 text-base mb-8 leading-relaxed max-w-[280px]"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isInView ? 0.7 + index * 0.15 : 0,
                }}
              >
                {strategy.description}
              </motion.p>

              {/* Bottom Spacer */}
              <div className="flex-1" />

              {/* Yield Block with Button */}
              <motion.div
                className="bg-onsurface-900 px-5 py-5 rounded-2xl flex flex-col gap-8 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isInView ? 0.8 + index * 0.15 : 0,
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">Yield</span>
                  <span className="text-white text-sm font-medium">{strategy.yieldRange} / day</span>
                </div>
                
                <button 
                  className="w-full font-medium py-5 rounded-xl text-sm transition-transform active:scale-[0.98] text-black"
                  style={{ backgroundColor: strategy.titleTextColor }}
                >
                  Invest to {strategy.name}
                </button>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Description Text */}
        <motion.p
          className="text-sm text-white-700 leading-normal max-w-2xl px-2 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: isInView ? 1.0 : 0 }}
        >
          Each strategy is its own algorithm, its own logic of profitability and risk.
        </motion.p>
      </div>
    </section>
  );
}
