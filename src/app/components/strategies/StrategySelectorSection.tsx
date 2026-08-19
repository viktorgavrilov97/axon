"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  icon: string;
  titleButtonColor: string;
  titleTextColor: string;
  yieldRange: string;
}

const strategies: Strategy[] = [
  {
    id: "macro",
    name: "Bondex Macro",
    description: "Global trends, macroeconomic cycles and algorithmic solutions.",
    icon: "/strategies/macro.svg",
    titleButtonColor: "#4F4F4F", // dark gray
    titleTextColor: "#FFFFFF", // white
    yieldRange: "0.90% - 1.80%",
  },
  {
    id: "crypto",
    name: "Bondex Crypto",
    description: "Dynamics of digital capital and high volatility under control.",
    icon: "/strategies/crypto.svg",
    titleButtonColor: "#FFFFFF", // white
    titleTextColor: "#000000", // black
    yieldRange: "1.20% - 2.00%",
  },
  {
    id: "gold",
    name: "Bondex Gold",
    description: "Stability and confidence of classic assets.",
    icon: "/strategies/gold.svg",
    titleButtonColor: "#FFF4B3", // light yellow
    titleTextColor: "#000000", // black
    yieldRange: "1.60% - 3.20%",
  },
];

export function StrategySelectorSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });

  return (
    <section ref={sectionRef} className="relative py-12 md:py-24 px-4 md:px-6 lg:px-20 overflow-hidden bg-black">
      <div className="relative z-10 w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto" style={{ marginTop: "-60px" }}>
        {/* Header */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: isInView ? 0.2 : 0,
          }}
        >
          <h2 className="text-xl md:text-xl text-white leading-tight tracking-normal">
            Core Bondex Strategies
          </h2>
        </motion.div>

        {/* Strategies - Static Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 mb-8 md:mb-16">
          {strategies.map((strategy, index) => (
            <motion.div
              key={strategy.id}
              className="relative bg-onsurface-900 rounded-2xl md:rounded-[32px] flex flex-col min-h-[300px] md:h-[400px] p-5 md:p-7"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                delay: isInView ? 0.4 + index * 0.15 : 0,
              }}
            >
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
                  width={34}
                  height={34}
                  className="h-[34px] w-auto"
                />
              </motion.div>

              {/* Spacer to push content down */}
              <div className="flex-1" />

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
                <span
                  className=""
                  style={{
                    fontSize: "14px",
                    color: strategy.id === "crypto" 
                      ? "#C0C5FC" 
                      : strategy.id === "gold" 
                      ? "#FCF1C0" 
                      : "#FFFFFF",
                  }}
                >
                  {strategy.name}
                </span>
              </motion.div>

              {/* Description */}
              <motion.p
                className="text-white-700 text-xs md:text-sm mb-6 leading-relaxed w-full md:w-1/2"
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

              {/* Yield Bar */}
              <motion.div
                className="px-0 py-0 rounded-full flex justify-between items-center mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isInView ? 0.8 + index * 0.15 : 0,
                }}
              >
                <span className="text-white text-sm">Yield</span>
                <span className="text-white text-sm">{strategy.yieldRange} / day</span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Description Text */}
        <motion.p
          className="text-sm text-white-700 leading-normal max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: isInView ? 1.0 : 0,
          }}
        >
          Each strategy is its own algorithm, its own logic of profitability and risk.
        </motion.p>
      </div>
    </section>
  );
}
