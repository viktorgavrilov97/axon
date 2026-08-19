"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Globe,
  ChartLine,
  StackSimple,
  Cpu,
  TrendUp,
  Pulse,
} from "@phosphor-icons/react";
import { LoginButton } from "../LoginButton";
import { MobileStrategySection } from "./MobileStrategySection";
import { MobileControlSection } from "./MobileControlSection";
import { MobileCommunitySection } from "./MobileCommunitySection";
import { MobileTransparencySection } from "./MobileTransparencySection";
import { MobileEarlyAccessSection } from "./MobileEarlyAccessSection";

const orbitStrategies = [
  "Bondex Starter",
  "Bondex Core",
  "Bondex Prime",
  "Bondex Silver",
  "Bondex Alloy",
  "Bondex Momentum",
  "Bondex Gold",
  "Bondex Capital",
  "Bondex Yield",
  "Bondex Apex",
];

const orbitBadgeColors = [
  "rgba(255, 253, 173, 0.6)",
  "rgba(147, 197, 253, 0.6)",
  "rgba(196, 181, 253, 0.6)",
  "rgba(129, 140, 248, 0.6)",
  "rgba(167, 243, 208, 0.6)",
  "rgba(251, 191, 36, 0.6)",
  "rgba(252, 165, 165, 0.6)",
  "rgba(196, 181, 253, 0.6)",
  "rgba(129, 140, 248, 0.6)",
  "rgba(167, 243, 208, 0.6)",
];

interface OrbitBadgeProps {
  position: [number, number, number];
  strategy: string;
  index: number;
  radius: number;
  speed: number;
  offset: number;
  isInView: boolean;
  prefersReducedMotion: boolean;
  borderColor: string;
}

function OrbitBadge({ position, strategy, index, radius, speed, offset, isInView, prefersReducedMotion, borderColor }: OrbitBadgeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    if (!isInView || prefersReducedMotion) return;

    timeRef.current += delta * speed;

    const initX = position[0];
    const initY = position[1];
    const initZ = position[2];
    
    const initRadius = Math.sqrt(initX * initX + initY * initY + initZ * initZ);
    const initTheta = Math.atan2(initZ, initX);
    const initPhi = Math.acos(initY / initRadius);

    const theta = initTheta + timeRef.current * 0.8;
    const phi = initPhi + Math.sin(timeRef.current * 0.4 + offset) * 0.25;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    meshRef.current.position.set(x, y, z);

    const cameraPosition = new THREE.Vector3(0, 0, 5);
    meshRef.current.lookAt(cameraPosition);
    
    if (y < 0) {
      meshRef.current.rotateZ(Math.PI);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <Html
        center
        distanceFactor={1}
        zIndexRange={[100, 0]}
        style={{
          pointerEvents: "auto",
          userSelect: "none",
        }}
        transform
        occlude
      >
        <motion.div
          className="px-3 py-1.5 rounded-full border cursor-pointer bg-black/60 backdrop-blur-sm"
          style={{
            borderColor: hovered ? borderColor : borderColor.replace("0.6", "0.4"),
            boxShadow: hovered ? `0 0 12px ${borderColor.replace("0.6", "0.3")}` : `0 0 4px ${borderColor.replace("0.6", "0.1")}`,
          }}
          animate={{
            scale: hovered ? 1.06 : 1,
          }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <motion.span
            className="text-base md:text-xl font-medium text-white-900 whitespace-nowrap"
            animate={{
              opacity: hovered ? 1 : 0.7,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            {strategy}
          </motion.span>
        </motion.div>
      </Html>
    </group>
  );
}

function MobileOrbitScene({ isInView, prefersReducedMotion }: { isInView: boolean; prefersReducedMotion: boolean }) {
  const sphereRadius = 2.5;
  const totalBadges = 30;

  const sphereBadges = useMemo(() => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const badges: Array<{
      index: number;
      strategy: string;
      initialPosition: [number, number, number];
      radius: number;
      speed: number;
      offset: number;
      borderColor: string;
    }> = [];

    for (let i = 0; i < totalBadges; i++) {
      const y = 1 - (i / (totalBadges - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const strategyIndex = i % orbitStrategies.length;

      badges.push({
        index: i,
        strategy: orbitStrategies[strategyIndex],
        initialPosition: [
          sphereRadius * x,
          sphereRadius * y,
          sphereRadius * z,
        ] as [number, number, number],
        radius: sphereRadius,
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
        borderColor: orbitBadgeColors[strategyIndex],
      });
    }

    return badges;
  }, [sphereRadius, totalBadges]);

  return (
    <>
      {sphereBadges.map((badge) => (
        <OrbitBadge
          key={`orbit-${badge.index}`}
          position={badge.initialPosition}
          strategy={badge.strategy}
          index={badge.index}
          radius={badge.radius}
          speed={badge.speed}
          offset={badge.offset}
          isInView={isInView}
          prefersReducedMotion={prefersReducedMotion}
          borderColor={badge.borderColor}
        />
      ))}
    </>
  );
}

export function MobileLandingSections() {
  const section1Ref = useRef(null);
  const isSection1InView = useInView(section1Ref, { once: false, amount: 0.2 });

  return (
    <div className="w-full overflow-x-hidden">
      {/* Секция 1 - Hero */}
      <section
        ref={section1Ref}
        className="bg-surface-900 relative overflow-hidden flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-10"
      >
        {/* Изображение по центру */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isSection1InView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative w-full max-w-md z-10 mb-8"
        >
          <Image
            src="/terminal.png"
            alt="Terminal dashboard"
            width={1140}
            height={900}
            className="block w-full h-auto rounded-lg"
            priority
          />
        </motion.div>

        {/* Текст и кнопка */}
        <motion.div
          className="flex flex-col gap-4 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={isSection1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.3,
          }}
        >
          <h1 className="text-2xl font-regular text-white-900 leading-tight">
            Investment platform<br />
            with real <TrendUp size={20} weight="regular" className="inline-block text-white-700 align-middle mx-1" /> strategies <br />and daily returns
          </h1>
          
          <p className="text-sm text-white-700 leading-relaxed">
            We combine professional expertise and algorithmic systems to manage capital transparently and in real time.
          </p>

          <div className="pt-2">
            <LoginButton />
          </div>
        </motion.div>
      </section>

      {/* Секция 2 - Video */}
      <MobileVideoSection />

      {/* Секция 3 - Bondex Core */}
      <MobileBondexSection />

      {/* Секция 4 - One Ecosystem */}
      <MobileEcosystemSection />

      {/* Секция 5 - Strategy Description */}
      <MobileStrategyDescriptionSection />

      {/* Секция 6 - Strategies */}
      <MobileStrategySection />

      {/* Секция 7 - Control */}
      <MobileControlSection />

      {/* Секция 8 - Community */}
      <MobileCommunitySection />

      {/* Секция 9 - Transparency */}
      <MobileTransparencySection />

      {/* Секция 10 - Early Access */}
      <MobileEarlyAccessSection />
    </div>
  );
}

function MobileVideoSection() {
  const sectionRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (isInView && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      className="bg-surface-900 relative overflow-hidden flex flex-col items-center px-4 pt-10 pb-20"
    >
      {/* Видео по центру */}
      <motion.div
        className="relative overflow-hidden rounded-lg w-full max-w-md mb-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <video
          ref={videoRef}
          src="/bondex2.mp4"
          loop
          muted
          playsInline
          className="w-full block"
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-white-900 text-sm">Meet Bondex</span>
        </motion.div>
      </motion.div>

      {/* Текст */}
      <motion.p
        className="text-sm text-white-700 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        A new generation asset powering the Axon ecosystem.
      </motion.p>
    </section>
  );
}

function MobileBondexSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="bg-surface-900 flex items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-md flex flex-col gap-12">
        {/* Верхняя часть: заголовок и описание */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-white-900 text-[9px] uppercase tracking-wider border border-onsurface-900 px-2.5 py-1 rounded-lg w-fit"
          >
            <Pulse size={12} weight="regular" className="text-white-700" />
            <span>CORE ASSET</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white-900 leading-tight"
          >
            Bondex - is the core of the Axon ecosystem
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-white-700"
          >
            A new generation asset, uniting four key markets into a single sustainable system.
          </motion.p>
        </div>

        {/* Нижняя часть: блоки с рынками и HYBRID INTELLIGENCE */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="bg-onsurface-900 rounded-xl p-3 h-24 flex flex-col justify-between">
              <Globe size={14} weight="regular" className="text-white-700" />
              <span className="text-white-900 text-[10px]">Currency market</span>
            </div>
            <div className="bg-onsurface-900 rounded-xl p-3 h-24 flex flex-col justify-between">
              <ChartLine size={14} weight="regular" className="text-white-700" />
              <span className="text-white-900 text-[10px]">Stock market</span>
            </div>
            <div className="bg-onsurface-900 rounded-xl p-3 h-24 flex flex-col justify-between">
              <StackSimple size={14} weight="regular" className="text-white-700" />
              <span className="text-white-900 text-[10px]">Commodity market</span>
            </div>
            <div className="bg-onsurface-900 rounded-xl p-3 h-24 flex flex-col justify-between">
              <Cpu size={14} weight="regular" className="text-white-700" />
              <span className="text-white-900 text-[10px]">Cryptocurrencies</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.9 }}
            className="pt-4 border-t border-surface-900"
          >
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} weight="regular" className="text-white-600" />
              <h3 className="text-[10px] text-white-900">HYBRID INTELLIGENCE</h3>
            </div>
            <p className="text-xs text-white-700">
              AI models analyze markets, and experts adjust the strategy. Technology and human as a single mechanism.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MobileEcosystemSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3, margin: "100px" });
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <section
      ref={sectionRef}
      className="bg-surface-900 relative overflow-hidden min-h-screen flex items-center justify-center px-4 py-20"
    >
      {/* Background Three.js Orbit */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]}
          style={{ 
            width: "100%", 
            height: "100%",
            display: "block",
            position: "relative",
            zIndex: 1
          }}
        >
          <ambientLight intensity={1.0} />
          <pointLight position={[5, 5, 5]} intensity={0.5} />
          <MobileOrbitScene isInView={isInView} prefersReducedMotion={prefersReducedMotion} />
        </Canvas>
      </div>

      {/* Text Content */}
      <div className="relative z-10 flex items-center justify-center">
        <motion.span
          className="text-white-900 text-xl md:text-2xl text-center leading-tight"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.4,
          }}
        >
          One ecosystem<br />
          — dozens of Bondex strategies
        </motion.span>
      </div>
    </section>
  );
}

function MobileStrategyDescriptionSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="bg-surface-900 flex items-center justify-center px-4 py-20"
    >
      <div className="w-full max-w-md">
        <motion.p
          className="text-white-900 text-base leading-relaxed whitespace-pre-line text-center"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
          transition={{
            duration: 1.0,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.3,
          }}
        >
          Each strategy distributes capital across currency, stock, commodity, and crypto markets.

          The system operates 24/7, with daily accruals and management through a personal account.

          Real specialists control every transaction, while technology ensures stable results.
        </motion.p>
      </div>
    </section>
  );
}
