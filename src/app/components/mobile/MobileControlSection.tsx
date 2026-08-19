"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { LoginButton } from "../LoginButton";

export function MobileControlSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="bg-surface-900 flex items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2,
          }}
          className="w-full"
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

        {/* Text Content */}
        <motion.div
          className="flex flex-col space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.4,
          }}
        >
          {/* Title */}
          <h2 className="text-lg text-white-900">
            Everything under control
          </h2>

          {/* Description */}
          <div className="text-white-700 text-sm space-y-2">
            <p>Manage capital through your personal account:</p>
            <ul className="list-none space-y-1 pl-0">
              <li>• track active strategies</li>
              <li>• see accruals and statistics</li>
              <li>• control balance in real-time</li>
            </ul>
          </div>

          {/* Login Button */}
          <div className="pt-2">
            <LoginButton />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
