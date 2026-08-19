"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { FileText, Certificate, ShieldCheck } from "@phosphor-icons/react";

export function TransparencySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });
  const documents = [
    {
      icon: ShieldCheck,
      text: "Asset management license",
    },
    {
      icon: Certificate,
      text: "Certificate of incorporation",
    },
    {
      icon: FileText,
      text: "Annual audit report",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="section-7"
      data-section
      className="h-screen bg-surface-900 relative overflow-hidden"
    >
      <div className="h-screen flex items-center justify-center">
        <div className="w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto px-4 md:px-6 lg:px-20 -mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left Section - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-8"
            >
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.1 : 0, ease: "easeOut" }}
                className="text-base md:text-lg lg:text-xl text-white-900 leading-tight"
              >
                Official status and transparency
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.2 : 0, ease: "easeOut" }}
                className="text-sm md:text-base text-white-600 max-w-md"
              >
                Axon Capital is registered and undergoes an annual audit. All documents, licenses, and certificates are open for inspection.
              </motion.p>

              <motion.ul
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.3 : 0, ease: "easeOut" }}
                className="space-y-4"
              >
                {documents.map((doc, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <doc.icon
                      size={24}
                      weight="regular"
                      className="text-white-700 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-base md:text-base text-white-700">
                      {doc.text}
                    </span>
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Right Section - Documents Stack */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: isInView ? 0.2 : 0, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative w-full aspect-[4/3] flex items-center justify-center gap-4">
                {/* First Certificate */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: isInView ? 0.3 : 0 }}
                  className="relative w-[32%] h-full"
                >
                  <Image
                    src="/certificat.png"
                    alt="Certificate of incorporation"
                    fill
                    className="object-contain"
                    priority
                  />
                </motion.div>

                {/* Second Certificate */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: isInView ? 0.4 : 0 }}
                  className="relative w-[32%] h-full"
                >
                  <Image
                    src="/certificat2.png"
                    alt="Asset management license"
                    fill
                    className="object-contain"
                    priority
                  />
                </motion.div>

                {/* Third Certificate */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: isInView ? 0.5 : 0 }}
                  className="relative w-[32%] h-full"
                >
                  <Image
                    src="/certificat3.png"
                    alt="Annual audit report"
                    fill
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

