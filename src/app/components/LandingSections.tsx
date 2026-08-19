"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  ChartLine,
  StackSimple,
  Cpu,
  ArrowRight,
  Shield,
  Pulse,
  TrendUp,
} from "@phosphor-icons/react";
import { StrategySelectorSection } from "./strategies/StrategySelectorSection";
import { ControlSection } from "./ControlSection";
import { StrategyOrbit } from "@/sections/StrategyOrbit";
import { CommunitySection } from "./CommunitySection";
import { TransparencySection } from "./TransparencySection";
import { EarlyAccessSection } from "./EarlyAccessSection";
import { LoginButton } from "./LoginButton";

function VideoTransitionSection({ id = "section-2" }: { id?: string }) {
  const sectionRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  // Перезапускаем видео с начала когда секция становится видимой
  useEffect(() => {
    if (isInView && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Игнорируем ошибки автовоспроизведения
      });
    }
  }, [isInView]);

  // Для секции 4 - только заголовок
  if (id === "section-4") {
    return (
      <section
        ref={sectionRef}
        id={id}
        data-section
        className="h-screen w-full relative bg-surface-900 flex items-center justify-center"
      >
        <div className="relative -mt-20 flex flex-col items-center gap-4">
          <motion.span
            className="text-white-900 text-2xl md:text-4xl lg:text-5xl px-4 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: isInView ? 0.4 : 0,
            }}
          >
            One ecosystem — dozens of Bondex strategies
          </motion.span>
        </div>
      </section>
    );
  }

  // Для секции 2 - с видео
  return (
    <section
      ref={sectionRef}
      id={id}
      data-section
      className="h-screen w-full relative bg-surface-900 flex items-center justify-center z-30"
      style={{ isolation: "isolate" }}
    >
      <div className="relative -mt-20 flex flex-col items-center gap-4">
        <motion.div
          className="relative overflow-hidden rounded-lg"
          initial={{ scale: 0.8, opacity: 0, y: 100 }}
          animate={isInView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.8, opacity: 0, y: 100 }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <video
            ref={videoRef}
            src="/bondex2.mp4"
            loop
            muted
            playsInline
            className="w-full max-w-full md:max-w-6xl block px-4 md:px-0"
            style={{
              display: "block",
              objectFit: "cover",
            }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              delay: isInView ? 0.4 : 0,
            }}
          >
            <span className="text-white-900 text-lg">Meet Bondex</span>
          </motion.div>
        </motion.div>
        <motion.p
          className="text-sm text-white-700"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: isInView ? 0.6 : 0,
          }}
        >
          A new generation asset powering the Axon ecosystem.
        </motion.p>
      </div>
    </section>
  );
}

function StrategyDescriptionSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      id="section-5"
      data-section
      className="h-screen bg-surface-900 relative z-20"
    >
      <div className="h-[calc(100vh-80px)] mt-[80px] flex items-center justify-center px-4 md:px-6 lg:px-20">
        <div className="w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto">
          <div className="max-w-xl mx-auto text-center px-4">
            <motion.p
              className="text-white-900 text-sm md:text-base lg:text-xl leading-relaxed whitespace-pre-line"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
              transition={{
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1],
                delay: isInView ? 0.3 : 0,
              }}
            >
              Each strategy distributes capital across currency, stock, commodity, and crypto markets.

              The system operates 24/7, with daily accruals and management through a personal account.

              Real specialists control every transaction, while technology ensures stable results.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingSections() {
  const section1Ref = useRef(null);
  const isSection1InView = useInView(section1Ref, { once: false, amount: 0.2 });

  return (
    <>
      {/* Секция 1 */}
      <section
        ref={section1Ref}
        id="section-1"
        data-section
        className="h-screen bg-surface-900 relative overflow-hidden"
      >
        {/* Video */}
        <div className="absolute inset-0 flex items-center justify-center z-10 px-4 md:px-0">
          <div className="relative w-full max-w-[960px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isSection1InView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{
                duration: 1.0,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Image
                src="/terminal.png"
                alt="Terminal dashboard"
                width={1140}
                height={900}
                className="block max-w-full max-h-full"
                priority
              />
            </motion.div>
            {/* Gradient overlay - поверх изображения */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 41%)',
              }}
              initial={{ opacity: 0 }}
              animate={isSection1InView ? { opacity: 1 } : { opacity: 0 }}
              transition={{
                duration: 0.8,
                delay: isSection1InView ? 0.3 : 0,
              }}
            />
            {/* Title under image - bottom left */}
            <motion.div
              className="absolute bottom-0 left-0 z-20 flex flex-col gap-6 md:gap-14 pt-0 px-4 md:px-0"
              initial={{ opacity: 0, y: 40 }}
              animate={isSection1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{
                duration: 1.0,
                ease: [0.16, 1, 0.3, 1],
                delay: isSection1InView ? 0.6 : 0,
              }}
            >
              <div className="flex flex-col md:flex-row items-start gap-6 md:gap-[200px]">
                <motion.h1
                  className="text-xl md:text-2xl lg:text-[32px] font-regular text-white-900 leading-tight"
                  initial={{ opacity: 0, x: -30 }}
                  animate={isSection1InView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: isSection1InView ? 0.8 : 0,
                  }}
                >
                  Investment platform<br />
                  with real <TrendUp size={20} weight="regular" className="inline-block text-white-700 align-middle mx-1 md:w-[34px] md:h-[34px]" /> strategies <br />and daily returns
                </motion.h1>
                <motion.p
                  className="text-xs md:text-sm text-white-700 leading-relaxed max-w-xs mt-0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={isSection1InView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: isSection1InView ? 1.0 : 0,
                  }}
                >
                  We combine professional expertise and algorithmic systems to manage capital transparently and in real time.
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isSection1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: isSection1InView ? 1.2 : 0,
                }}
              >
                <LoginButton />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Секция 2 - Video Transition */}
      <VideoTransitionSection id="section-2" />

      {/* Секция 3 */}
      <section
        id="section-3"
        data-section
        className="h-screen bg-surface-900 relative z-20"
      >
        <div className="h-[calc(100vh-80px)] mt-[60px] flex items-center justify-center px-4 md:px-6 lg:px-20">
          <div className="w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3, once: false }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
              className="space-y-12"
            >
              {/* Core Asset Label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: false }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 text-white-900 text-[10px] uppercase tracking-wider border border-onsurface-900 px-3 py-1.5 rounded-lg w-fit"
              >
                <Pulse size={14} weight="regular" className="text-white-700" />
                <span>CORE ASSET</span>
              </motion.div>

              {/* Main Title and Description */}
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl lg:text-xl text-white-900 leading-tight mb-4"
                >
                  Bondex - is the core of the Axon ecosystem
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.4 }}
                  className="text-body2 text-white-700"
                >
                  A new generation asset, uniting four key markets into a single
                  sustainable system.
                </motion.p>
              </div>

              {/* Market Categories Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: false }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-1"
              >
                {/* Currency market */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.6 }}
                  className="bg-onsurface-900 rounded-2xl p-4 md:p-6 hover:border-white-600 transition-colors cursor-pointer h-[150px] md:h-[200px]"
                >
                  <div className="flex flex-col justify-between h-full">
                    <Globe size={14} weight="regular" className="text-white-700 flex-shrink-0 md:w-4 md:h-4" />
                    <span className="text-white-900 text-xs md:text-sm">
                      Currency market
                    </span>
                  </div>
                </motion.div>

                {/* Stock market */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.7 }}
                  className="bg-onsurface-900 rounded-2xl p-4 md:p-6 hover:border-white-600 transition-colors cursor-pointer h-[150px] md:h-[200px]"
                >
                  <div className="flex flex-col justify-between h-full">
                    <ChartLine size={14} weight="regular" className="text-white-700 flex-shrink-0 md:w-4 md:h-4" />
                    <span className="text-white-900 text-sm">
                      Stock market
                    </span>
                  </div>
                </motion.div>

                {/* Cryptocurrencies */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.8 }}
                  className="bg-onsurface-900 rounded-2xl p-4 md:p-6 hover:border-white-600 transition-colors cursor-pointer h-[150px] md:h-[200px]"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Image
                        src="/networks/tether.svg"
                        alt="USDT"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <Image
                        src="/networks/erc20.svg"
                        alt="ETH"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <Image
                        src="/networks/binance.svg"
                        alt="BNB"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <Image
                        src="/networks/solana.svg"
                        alt="SOL"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <Image
                        src="/networks/usdc.svg"
                        alt="USDC"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </div>
                    <span className="text-white-900 text-sm">
                      Cryptocurrencies
                    </span>
                  </div>
                </motion.div>

                {/* Commodity market */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ amount: 0.3, once: false }}
                  transition={{ delay: 0.9 }}
                  className="bg-onsurface-900 rounded-2xl p-4 md:p-6 hover:border-white-600 transition-colors cursor-pointer h-[150px] md:h-[200px]"
                >
                  <div className="flex flex-col justify-between h-full">
                    <StackSimple size={14} weight="regular" className="text-white-700 flex-shrink-0 md:w-4 md:h-4" />
                    <span className="text-white-900 text-sm">
                      Commodity market
                    </span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Hybrid Intelligence Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3, once: false }}
                transition={{ delay: 0.9 }}
                className="pt-6 border-t border-surface-900"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Cpu size={14} weight="regular" className="text-white-600 flex-shrink-0 md:w-4 md:h-4" />
                  <h3 className="text-xs text-white-900">
                    HYBRID INTELLIGENCE
                  </h3>
                </div>
                <p className="text-white-700 text-sm leading-relaxed">
                  AI models analyze markets, and experts adjust the strategy.
                  Technology and human as a single mechanism.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Секция 4 - Strategy Orbit */}
      <StrategyOrbit />

      {/* Секция 5 - Strategy Description */}
      <StrategyDescriptionSection />

      {/* Секция 6 */}
      <section
        id="section-6"
        data-section
        className="h-screen bg-surface-900 overflow-y-auto"
      >
        <div className="h-[calc(100vh-80px)] mt-[80px]">
          <StrategySelectorSection />
        </div>
      </section>

      {/* Секция 7 */}
      <ControlSection />

      {/* Секция 8 */}
      <CommunitySection />

      {/* Секция 9 */}
      <TransparencySection />

      {/* Секция 10 */}
      <EarlyAccessSection />
    </>
  );
}

