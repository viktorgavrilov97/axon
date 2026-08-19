"use client";

import { useEffect, useRef, useState } from "react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isGreen: boolean;
}

export function MarketCandlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Initialize candles
  useEffect(() => {
    const initialCandles: Candle[] = [];
    const basePrice = 50000;
    let currentPrice = basePrice;

    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * 200;
      const open = currentPrice;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      
      initialCandles.push({
        time: i,
        open,
        high,
        low,
        close,
        isGreen: close > open,
      });
      
      currentPrice = close;
    }
    
    setCandles(initialCandles);
  }, []);

  // Animate candles
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let lastUpdate = Date.now();
    const updateInterval = 1000; // Update every second

    const animate = () => {
      const now = Date.now();
      
      if (now - lastUpdate >= updateInterval) {
        setCandles((prev) => {
          const newCandles = [...prev];
          // Remove oldest candle
          newCandles.shift();
          
          // Add new candle
          const lastCandle = prev[prev.length - 1];
          const change = (Math.random() - 0.5) * 200;
          const open = lastCandle.close;
          const close = open + change;
          const high = Math.max(open, close) + Math.random() * 100;
          const low = Math.min(open, close) - Math.random() * 100;
          
          newCandles.push({
            time: prev.length,
            open,
            high,
            low,
            close,
            isGreen: close > open,
          });
          
          return newCandles;
        });
        lastUpdate = now;
      }

      // Draw candles
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const candleWidth = canvas.width / candles.length;
      const padding = 100;
      const chartHeight = canvas.height - padding * 2;
      
      // Find price range
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      candles.forEach((candle) => {
        minPrice = Math.min(minPrice, candle.low);
        maxPrice = Math.max(maxPrice, candle.high);
      });
      const priceRange = maxPrice - minPrice || 1;
      
      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Draw candles
      candles.forEach((candle, index) => {
        const x = (index * candleWidth) + candleWidth / 2;
        const bodyTop = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
        const bodyBottom = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;
        const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
        const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;
        
        const wickWidth = 1;
        const bodyWidth = candleWidth * 0.6;
        
        // Draw wick
        ctx.strokeStyle = candle.isGreen 
          ? "rgba(200, 200, 200, 0.4)" 
          : "rgba(120, 120, 120, 0.4)";
        ctx.lineWidth = wickWidth;
        ctx.beginPath();
        ctx.moveTo(x, bodyTop);
        ctx.lineTo(x, bodyBottom);
        ctx.stroke();
        
        // Draw body
        ctx.fillStyle = candle.isGreen 
          ? "rgba(200, 200, 200, 0.35)" 
          : "rgba(120, 120, 120, 0.35)";
        const bodyTopY = Math.min(openY, closeY);
        const bodyHeight = Math.abs(closeY - openY) || 2;
        ctx.fillRect(x - bodyWidth / 2, bodyTopY, bodyWidth, bodyHeight);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [candles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-0"
    />
  );
}

