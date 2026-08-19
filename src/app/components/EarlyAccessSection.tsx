"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import { TelegramLogo, YoutubeLogo } from "@phosphor-icons/react";
import { LoginButton } from "./LoginButton";

const strategies = [
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

// Color palette for badge borders
const badgeColors = [
  "rgba(255, 253, 173, 0.6)", // Yellow
  "rgba(147, 197, 253, 0.6)", // Blue
  "rgba(196, 181, 253, 0.6)", // Purple
  "rgba(129, 140, 248, 0.6)", // Indigo
  "rgba(167, 243, 208, 0.6)", // Green
  "rgba(251, 191, 36, 0.6)",  // Amber
  "rgba(252, 165, 165, 0.6)", // Red
  "rgba(196, 181, 253, 0.6)", // Purple
  "rgba(129, 140, 248, 0.6)", // Indigo
  "rgba(167, 243, 208, 0.6)", // Green
];

interface BadgeProps {
  position: [number, number, number];
  strategy: string;
  index: number;
  radius: number;
  speed: number;
  offset: number;
  isInView: boolean;
  prefersReducedMotion: boolean;
  borderColor: string;
  isMobile: boolean;
}

function Badge({ position, strategy, index, radius, speed, offset, isInView, prefersReducedMotion, borderColor, isMobile }: BadgeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (!isInView || prefersReducedMotion) {
      return;
    }

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

    const cameraPosition = new THREE.Vector3(0, 0, 30);
    const up = new THREE.Vector3(0, 1, 0);
    
    meshRef.current.lookAt(cameraPosition);
    
    if (y < 0) {
      meshRef.current.rotateZ(Math.PI);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <Html
        center
        distanceFactor={isMobile ? 2.5 : 4}
        zIndexRange={[100, 0]}
        style={{
          pointerEvents: "auto",
          userSelect: "none",
        }}
        transform
        occlude
      >
        <motion.div
          className={`px-2 py-1 md:px-3 md:py-1.5 rounded-full border cursor-pointer bg-black/60 backdrop-blur-sm ${isMobile ? 'scale-75' : ''}`}
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
            className="text-sm md:text-lg lg:text-2xl font-medium text-white-900 whitespace-nowrap"
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

function Scene({ isInView, prefersReducedMotion }: { isInView: boolean; prefersReducedMotion: boolean }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sphereRadius = isMobile ? 15.0 : 25.0;
  const totalBadges = isMobile ? 20 : 50;

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

      const strategyIndex = i % strategies.length;

      badges.push({
        index: i,
        strategy: strategies[strategyIndex],
        initialPosition: [
          sphereRadius * x,
          sphereRadius * y,
          sphereRadius * z,
        ] as [number, number, number],
        radius: sphereRadius,
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
        borderColor: badgeColors[strategyIndex],
      });
    }

    return badges;
  }, [sphereRadius, totalBadges]);

  return (
    <>
      {sphereBadges.map((badge) => (
        <Badge
          key={`sphere-${badge.index}`}
          position={badge.initialPosition}
          strategy={badge.strategy}
          index={badge.index}
          radius={badge.radius}
          speed={badge.speed}
          offset={badge.offset}
          isInView={isInView}
          prefersReducedMotion={prefersReducedMotion}
          borderColor={badge.borderColor}
          isMobile={isMobile}
        />
      ))}
    </>
  );
}

export function EarlyAccessSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3, margin: "100px" });
  const prefersReducedMotion = useReducedMotion() ?? false;

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

  return (
    <section
      ref={sectionRef}
      id="section-8"
      data-section
      className="h-screen bg-surface-900 relative overflow-hidden"
    >
      {/* Background Three.js Orbit */}
      <div className="absolute inset-0 w-full h-full -mt-20 opacity-30">
        <Canvas
          camera={{ position: [0, 0, 30], fov: 110 }}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, typeof window !== 'undefined' && window.innerWidth < 768 ? 1.5 : 2]}
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
          <Scene isInView={isInView} prefersReducedMotion={prefersReducedMotion} />
        </Canvas>
      </div>

      <div className="h-screen flex items-center justify-center relative z-10">
        <div className="w-full max-w-full md:max-w-[calc(100%-160px)] mx-auto px-4 md:px-6 lg:px-20 -mt-20">
          <div className="flex flex-col items-center justify-center text-center space-y-6 md:space-y-12">
            {/* LIMITED OFFER Label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: isInView ? 0.1 : 0 }}
              className="inline-block border border-onsurface-800 px-3 py-1 rounded-full"
            >
              <span className="text-xs text-white-900 uppercase tracking-wider">
                LIMITED OFFER
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: isInView ? 0.2 : 0 }}
              className="text-xl md:text-2xl lg:text-4xl text-white-900 leading-tight tracking-tight"
            >
              Early access open
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: isInView ? 0.3 : 0 }}
              className="text-base md:text-base text-white-700 max-w-xl mx-auto"
            >
              Axon launches the first public pool of Bondex strategies. Early access participants receive increased profitability and priority in distribution.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: isInView ? 0.4 : 0 }}
            >
              <LoginButton href="/auth/email">
                Get early access
              </LoginButton>
            </motion.div>

            {/* Social Media Icons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: isInView ? 0.5 : 0 }}
              className="flex flex-wrap items-center justify-center gap-6 pt-8"
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
                      transition={{ duration: 0.3, delay: isInView ? 0.6 + idx * 0.1 : 0 }}
                      className="w-10 h-10 flex items-center justify-center transition-all duration-300 group-hover:opacity-80"
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
          </div>
        </div>
      </div>
    </section>
  );
}
