"use client";

import { motion } from "framer-motion";
import { LoginButton } from "./LoginButton";

export function ControlSection() {
  return (
    <section
      id="section-5"
      data-section
      className="h-screen bg-surface-900 relative overflow-hidden"
    >
      <div className="h-screen flex items-center justify-center">
        <div className="relative z-10 w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto px-4 md:px-6 lg:px-20" style={{ marginTop: "-100px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 md:gap-12 lg:gap-28 items-center">
            {/* Left Section - Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.3, once: false }}
              transition={{
                duration: 1.0,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
              className="w-full order-2 lg:order-1"
            >
              <div className="border border-onsurface-900 rounded-xl overflow-hidden w-full">
                <video
                  src="/888.mp4"
                  loop
                  muted
                  playsInline
                  autoPlay
                  className="block w-full h-auto"
                />
              </div>
            </motion.div>

            {/* Right Section - Text */}
            <motion.div
              className="flex flex-col order-1 lg:order-2 lg:ml-8"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.3, once: false }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.5,
              }}
            >
              {/* Title */}
              <h2 className="text-white-900 text-base md:text-xl mb-6 md:mb-12">
                Everything under control
              </h2>

              {/* Description */}
              <div className="text-white-700 text-xs md:text-sm mb-6 md:mb-12">
                <p className="mb-2">Manage capital through your personal account:</p>
                <ul className="list-none space-y-1">
                  <li>• track active strategies</li>
                  <li>• see accruals and statistics</li>
                  <li>• control balance in real-time</li>
                </ul>
              </div>

              {/* Login Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: false }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.7,
                }}
              >
                <LoginButton />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

