"use client";

import React, { useEffect, useMemo, useRef } from "react";

type FeatureGraphProps = {
  className?: string;
  /** Higher = more volatility */
  volatility?: number; // default 0.9
  /** Update speed of "market" */
  speed?: number; // default 1.0
  /** Opacity of chart */
  opacity?: number; // default 1.0
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function FeatureGraph({
  className,
  volatility = 0.9,
  speed = 1.0,
  opacity = 1.0,
}: FeatureGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Simulation state held outside React renders
  const sim = useRef({
    t: 0,
    lastTs: 0,
    paused: false,
    // series
    price: 0,
    target: 0,
    // arrays
    bars: [] as { o: number; c: number; hi: number; lo: number }[],
    line: [] as number[],
    pulses: [] as { x: number; y: number; r: number; life: number }[],
  });

  const config = useMemo(
    () => ({
      barCount: 64, // number of candles on screen
      lineCount: 96, // samples for smooth line
      // rendering
      paddingX: 24,
      paddingY: 18,
      gridSize: 24,
      // animation
      barWidth: 3,
      wickWidth: 1,
      // colors (monochrome, subtle)
      gridColor: "rgba(255,255,255,0.04)",
      lineColor: "rgba(255,255,255,0.12)",
      barColor: "rgba(255,255,255,0.08)",
      wickColor: "rgba(255,255,255,0.06)",
      // market params
      baseVolatility: 0.015,
      trendStrength: 0.002,
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    // Initialize data
    const init = () => {
      sim.current.price = 0.5;
      sim.current.target = 0.5;
      sim.current.bars = [];
      sim.current.line = [];

      // Generate initial bars
      for (let i = 0; i < config.barCount; i++) {
        const drift = (Math.random() - 0.5) * 0.02;
        sim.current.price = Math.max(0.1, Math.min(0.9, sim.current.price + drift));

        const o = sim.current.price;
        const c = Math.max(0.1, Math.min(0.9, o + (Math.random() - 0.5) * 0.04));
        const hi = Math.max(o, c) + Math.random() * 0.03;
        const lo = Math.min(o, c) - Math.random() * 0.03;

        sim.current.bars.push({
          o,
          c,
          hi: Math.max(0.1, Math.min(0.95, hi)),
          lo: Math.max(0.05, Math.min(0.9, lo)),
        });

        sim.current.price = c;
      }

      // Generate initial line samples
      for (let i = 0; i < config.lineCount; i++) {
        const idx = Math.floor((i / config.lineCount) * sim.current.bars.length);
        const bar = sim.current.bars[idx] || sim.current.bars[sim.current.bars.length - 1];
        sim.current.line.push(bar.c);
      }
    };

    init();

    const getPriceRange = () => {
      let min = Infinity;
      let max = -Infinity;

      for (const bar of sim.current.bars) {
        min = Math.min(min, bar.lo);
        max = Math.max(max, bar.hi);
      }

      for (const val of sim.current.line) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }

      const pad = (max - min) * 0.2;
      return { min: Math.max(0, min - pad), max: Math.min(1, max + pad) };
    };

    const priceToY = (price: number, range: { min: number; max: number }) => {
      const t = (price - range.min) / (range.max - range.min);
      const top = h * 0.25;
      const bottom = h * 0.75;
      return top + (bottom - top) * (1 - t);
    };

    const draw = () => {
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      const range = getPriceRange();
      const chartLeft = config.paddingX;
      const chartRight = w - config.paddingX;
      const chartTop = config.paddingY;
      const chartBottom = h - config.paddingY;
      const chartW = chartRight - chartLeft;
      const chartH = chartBottom - chartTop;

      // Grid
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = config.gridColor;
      ctx.lineWidth = 1;

      for (let x = chartLeft; x <= chartRight; x += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, chartTop);
        ctx.lineTo(x + 0.5, chartBottom);
        ctx.stroke();
      }

      for (let y = chartTop; y <= chartBottom; y += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(chartLeft, y + 0.5);
        ctx.lineTo(chartRight, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      // Line (smoothed close prices)
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = config.lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const lineSpacing = chartW / (config.lineCount - 1);
      for (let i = 0; i < config.lineCount; i++) {
        const x = chartLeft + i * lineSpacing;
        const y = priceToY(sim.current.line[i], range);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Candles
      ctx.save();
      ctx.globalAlpha = opacity;
      const barSpacing = chartW / config.barCount;
      const halfBarW = config.barWidth / 2;

      for (let i = 0; i < sim.current.bars.length; i++) {
        const bar = sim.current.bars[i];
        const x = chartLeft + i * barSpacing + barSpacing / 2;

        const yO = priceToY(bar.o, range);
        const yC = priceToY(bar.c, range);
        const yH = priceToY(bar.hi, range);
        const yL = priceToY(bar.lo, range);

        // Wick
        ctx.strokeStyle = config.wickColor;
        ctx.lineWidth = config.wickWidth;
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        // Body
        const top = Math.min(yO, yC);
        const bottom = Math.max(yO, yC);
        const bodyH = Math.max(1, bottom - top);

        ctx.fillStyle = config.barColor;
        ctx.fillRect(x - halfBarW, top, config.barWidth, bodyH);
      }
      ctx.restore();
    };

    const update = (dt: number) => {
      if (sim.current.paused || prefersReducedMotion()) return;

      const vol = config.baseVolatility * volatility;
      const trend = (Math.random() - 0.5) * config.trendStrength * speed;

      // Update target price (slow drift)
      sim.current.target += trend;
      sim.current.target = Math.max(0.1, Math.min(0.9, sim.current.target));

      // Price follows target with some noise
      const noise = (Math.random() - 0.5) * vol * speed;
      sim.current.price += (sim.current.target - sim.current.price) * 0.02 + noise;
      sim.current.price = Math.max(0.1, Math.min(0.9, sim.current.price));

      // Shift bars left (remove oldest, add new)
      const shouldAddBar = Math.random() < dt * (0.8 * speed);
      if (shouldAddBar) {
        sim.current.bars.shift();

        const lastBar = sim.current.bars[sim.current.bars.length - 1];
        const base = lastBar?.c ?? sim.current.price;

        const o = base;
        const c = Math.max(0.1, Math.min(0.9, base + (Math.random() - 0.5) * vol * 2));
        const hi = Math.max(o, c) + Math.random() * vol;
        const lo = Math.min(o, c) - Math.random() * vol;

        sim.current.bars.push({
          o,
          c,
          hi: Math.max(0.1, Math.min(0.95, hi)),
          lo: Math.max(0.05, Math.min(0.9, lo)),
        });
      }

      // Update line samples (interpolate from bars)
      for (let i = 0; i < config.lineCount; i++) {
        const t = i / (config.lineCount - 1);
        const barIdx = t * (sim.current.bars.length - 1);
        const idx0 = Math.floor(barIdx);
        const idx1 = Math.min(idx0 + 1, sim.current.bars.length - 1);
        const frac = barIdx - idx0;

        const bar0 = sim.current.bars[idx0];
        const bar1 = sim.current.bars[idx1];

        if (bar0 && bar1) {
          sim.current.line[i] = bar0.c + (bar1.c - bar0.c) * frac;
        } else if (bar0) {
          sim.current.line[i] = bar0.c;
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - sim.current.lastTs) / 1000, 0.033);
      sim.current.lastTs = now;
      sim.current.t += dt;

      update(dt * speed);
      draw();

      rafRef.current = requestAnimationFrame(tick);
    };

    sim.current.lastTs = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [config, speed, volatility, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
