"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { TelegramLogo, YoutubeLogo } from "@phosphor-icons/react";

export function CommunitySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });
  const socialLinks = [
    {
      name: "Telegram",
      icon: TelegramLogo,
      href: "https://t.me/axon_capital",
    },
    {
      name: "YouTube",
      icon: YoutubeLogo,
      href: "https://www.youtube.com/@AxonCapital-h5v",
    },
  ];

  const ambassadors = [
    "LONDON",
    "DUBAI",
    "SINGAPORE",
    "ZURICH",
    "SEOUL",
    "CAPE TOWN",
    "WARSAW",
    "ISTANBUL",
    "RIGA",
  ];

  return (
    <section
      ref={sectionRef}
      id="section-6"
      data-section
      className="h-screen bg-surface-900 relative overflow-hidden"
    >
      <div className="h-[calc(100vh-80px)] mt-[80px] flex items-center">
        <div className="w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto px-4 md:px-6 lg:px-20 -mt-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 lg:gap-20 items-start">
            {/* Left Section - Portraits Grid */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="relative w-full max-w-[90%] aspect-[4/3]">
                <Image
                  src="/harmonious_grid_of_diverse_professional_portraits_in_black_and_white-DqDJNUiW.png"
                  alt="Axon ambassadors"
                  fill
                  className="object-cover object-top opacity-70"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Darkening gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              </div>
              
              {/* Ambassadors list */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.3 : 0, ease: "easeOut" }}
                className="text-xs md:text-sm text-white-600 uppercase tracking-wide"
              >
                AXON AMBASSADORS — {ambassadors.join(", ")}
              </motion.p>
            </motion.div>

            {/* Right Section - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: isInView ? 0.2 : 0, ease: "easeOut" }}
              className="space-y-8 flex flex-col justify-center"
            >
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.1 : 0, ease: "easeOut" }}
                className="text-4xl md:text-5xl lg:text-xl text-white-900 leading-tight"
              >
                Axon unites talents worldwide
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.2 : 0, ease: "easeOut" }}
                className="text-sm md:text-lg lg:text-xl text-white-700 leading-relaxed"
              >
                Our ecosystem grows through a network of ambassadors representing Axon Capital in key financial regions — from London and Zurich to Dubai, Singapore, and Cape Town.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.3 : 0, ease: "easeOut" }}
                className="text-sm md:text-base text-white-700 leading-relaxed"
              >
                We are building a global community where market leaders, traders, analysts, and entrepreneurs become part of a new capital architecture. Follow the project and its large-scale development — in each country, Axon has its own voices, its own ideas, its own people.
              </motion.p>

              {/* Social Media Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: isInView ? 0.3 : 0, ease: "easeOut" }}
                className="flex flex-wrap gap-4"
              >
                {socialLinks.map((social, idx) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, delay: isInView ? 0.4 + idx * 0.1 : 0 }}
                        className="w-12 h-12 rounded-full bg-transparent flex items-center justify-center transition-all duration-300 group-hover:bg-white-900/10"
                      >
                        <Icon
                          size={24}
                          weight="fill"
                          className="text-white-700 group-hover:text-white-900 transition-colors"
                        />
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
