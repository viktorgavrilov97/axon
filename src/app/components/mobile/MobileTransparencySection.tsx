"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { FileText, Certificate, ShieldCheck } from "@phosphor-icons/react";

export function MobileTransparencySection() {
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
      className="bg-surface-900 flex items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          <h2 className="text-lg text-white-900 leading-tight">
            Official status and transparency
          </h2>
          
          <p className="text-sm text-white-600">
            Axon Capital is registered and undergoes an annual audit. All documents, licenses, and certificates are open for inspection.
          </p>

          <ul className="space-y-4">
            {documents.map((doc, index) => (
              <motion.li
                key={index}
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              >
                <doc.icon
                  size={20}
                  weight="regular"
                  className="text-white-700 mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-white-700">
                  {doc.text}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Documents Stack */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="relative"
        >
          <div className="relative w-full aspect-[4/3] flex items-center justify-center gap-3">
            {/* First Certificate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
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
              transition={{ duration: 0.6, delay: 0.4 }}
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
              transition={{ duration: 0.6, delay: 0.5 }}
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
    </section>
  );
}
