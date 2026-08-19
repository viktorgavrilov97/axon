"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { TelegramLogo, YoutubeLogo } from "@phosphor-icons/react";

export function MobileCommunitySection() {
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
      className="bg-surface-900 flex items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-md space-y-8">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="relative w-full aspect-[4/3]">
            <Image
              src="/harmonious_grid_of_diverse_professional_portraits_in_black_and_white-DqDJNUiW.png"
              alt="Axon ambassadors"
              fill
              className="object-cover object-top opacity-70 rounded-lg"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none rounded-lg" />
          </div>
          
          <p className="text-xs text-white-600 uppercase tracking-wide">
            AXON AMBASSADORS — {ambassadors.join(", ")}
          </p>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="space-y-6"
        >
          <h2 className="text-3xl text-white-900 leading-tight">
            Axon unites talents worldwide
          </h2>
          
          <p className="text-sm text-white-700 leading-relaxed">
            Our ecosystem grows through a network of ambassadors representing Axon Capital in key financial regions — from London and Zurich to Dubai, Singapore, and Cape Town.
          </p>

          <p className="text-sm text-white-700 leading-relaxed">
            We are building a global community where market leaders, traders, analysts, and entrepreneurs become part of a new capital architecture. Follow the project and its large-scale development — in each country, Axon has its own voices, its own ideas, its own people.
          </p>

          {/* Social Media Links */}
          <div className="flex flex-wrap gap-4 pt-4">
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
                    transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                    className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center transition-all duration-300 group-hover:bg-white-900/10"
                  >
                    <Icon
                      size={20}
                      weight="fill"
                      className="text-white-700 group-hover:text-white-900 transition-colors"
                    />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
