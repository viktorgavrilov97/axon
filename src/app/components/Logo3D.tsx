"use client";

import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ExtrudeGeometry, Shape, MeshStandardMaterial, DoubleSide } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as THREE from "three";

function LogoMesh() {
  const meshRef = useRef<THREE.Group>(null);
  
  // Загружаем SVG
  const svgData = useLoader(SVGLoader, "/logo.svg");
  
  // Создаем 3D геометрию из SVG
  const { geometries, material, boundingBox } = useMemo(() => {
    const shapes: Shape[] = [];
    svgData.paths.forEach((path) => {
      const shapesForPath = path.toShapes(true);
      shapes.push(...shapesForPath);
    });

    // Вычисляем bounding box для центрирования
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach((shape) => {
      const points = shape.getPoints();
      points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);

    // Создаем новые центрированные формы через создание новых точек
    const centeredShapes = shapes.map((shape) => {
      const points = shape.getPoints();
      const centeredPoints = points.map((point) => new THREE.Vector2(
        point.x - centerX,
        point.y - centerY
      ));
      return new Shape(centeredPoints);
    });

    // Экструдируем формы
    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    };

    const geoms = centeredShapes.map((shape) => new ExtrudeGeometry(shape, extrudeSettings));

    // Материал - темнее на 20%, без бликов
    const mat = new MeshStandardMaterial({
      color: "#666666",
      metalness: 0.0,
      roughness: 1.0,
      side: DoubleSide,
    });

    return { 
      geometries: geoms, 
      material: mat,
      boundingBox: { width: maxDim, height: maxDim }
    };
  }, [svgData]);

  // Анимация вращения
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // Горизонтальное вращение
    }
  });

  // Масштабируем чтобы поместился в сцену
  const scale = useMemo(() => {
    if (!boundingBox) return 0.1;
    // Нормализуем размер - делаем логотип маленьким для header
    const maxDim = Math.max(boundingBox.width, boundingBox.height);
    // Масштабируем так, чтобы логотип был примерно 1 единица в размере
    return 1.5 / maxDim;
  }, [boundingBox]);

  return (
    <group ref={meshRef} scale={[scale, scale, scale]} position={[0, 0, 0]}>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} />
      ))}
    </group>
  );
}

function Logo3DContent() {
  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 75 }}
      dpr={[1, 2]}
      gl={{ 
        antialias: true, 
        alpha: true, // Прозрачный фон
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene }) => {
        // Устанавливаем полностью прозрачный фон
        gl.setClearColor(0x000000, 0);
        scene.background = null;
      }}
      style={{ 
        width: "100%", 
        height: "100%", 
        background: "transparent",
        backgroundColor: "transparent",
        display: "block"
      }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <directionalLight position={[-5, -5, -5]} intensity={0.2} />
      <Suspense fallback={null}>
        <LogoMesh />
      </Suspense>
    </Canvas>
  );
}

export function Logo3D() {
  return (
    <div 
      className="w-12 h-12 relative -ml-2"
    >
      <Logo3DContent />
    </div>
  );
}

