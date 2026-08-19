"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { motion, useReducedMotion, useInView } from "framer-motion";
import * as THREE from "three";

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
}

function Badge({ position, strategy, index, radius, speed, offset, isInView, prefersReducedMotion, borderColor }: BadgeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (!isInView || prefersReducedMotion) {
      // Keep position but don't animate
      return;
    }

    timeRef.current += delta * speed;

    // Get initial position and convert to spherical coordinates
    const initX = position[0];
    const initY = position[1];
    const initZ = position[2];
    
    const initRadius = Math.sqrt(initX * initX + initY * initY + initZ * initZ);
    const initTheta = Math.atan2(initZ, initX);
    const initPhi = Math.acos(initY / initRadius);

    // Animate: rotate around Y axis and add wave motion
    const theta = initTheta + timeRef.current * 0.8; // Rotation around vertical axis
    const phi = initPhi + Math.sin(timeRef.current * 0.4 + offset) * 0.25; // Wave motion along sphere

    // Convert back to Cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    meshRef.current.position.set(x, y, z);

    // Always face camera with correct orientation (not upside down)
    const cameraPosition = new THREE.Vector3(0, 0, 5);
    const up = new THREE.Vector3(0, 1, 0);
    
    // Use lookAt with explicit up vector
    meshRef.current.lookAt(cameraPosition);
    
    // Check if the badge is on the bottom half of the sphere and flip if needed
    // This prevents upside-down text when badges are below the equator
    if (y < 0) {
      // For badges below center, rotate 180 degrees around Z axis to keep text readable
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

function Scene({ isInView, prefersReducedMotion }: { isInView: boolean; prefersReducedMotion: boolean }) {
  const sphereRadius = 2.5;
  const totalBadges = 30; // Total number of badges for full sphere

  // Fibonacci sphere algorithm for even distribution on sphere
  const sphereBadges = useMemo(() => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
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
      const y = 1 - (i / (totalBadges - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      const theta = goldenAngle * i; // golden angle increment

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Use strategy index modulo to cycle through strategies
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
        speed: 0.3 + Math.random() * 0.4, // Random speed between 0.3-0.7 for more visible movement
        offset: Math.random() * Math.PI * 2, // Random phase offset for varied wave motion
        borderColor: badgeColors[strategyIndex], // Assign color based on strategy
      });
    }

    return badges;
  }, []);

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
        />
      ))}
    </>
  );
}

interface StrategyOrbitProps {
  className?: string;
  scale?: number;
  opacity?: number;
  showHeadline?: boolean;
  customContent?: React.ReactNode;
  sectionId?: string;
}

export function StrategyOrbit({ 
  className = "", 
  scale = 1, 
  opacity = 1,
  showHeadline = true,
  customContent,
  sectionId = "section-4"
}: StrategyOrbitProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.3, margin: "100px" });
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <section
      ref={sectionRef}
      id={sectionId}
      data-section
      className={`h-screen w-full relative bg-surface-900 flex items-center justify-center overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 w-full h-full -mt-20">
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
          <Scene isInView={isInView} prefersReducedMotion={prefersReducedMotion} />
        </Canvas>
      </div>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none -mt-40">
        {showHeadline ? (
          <h2 className="text-white-900 text-xl md:text-2xl text-center leading-tight">
            One ecosystem —<br />
            dozens of Bondex strategies
          </h2>
        ) : (
          customContent
        )}
      </div>
    </section>
  );
}
