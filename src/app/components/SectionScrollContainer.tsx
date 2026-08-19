"use client";

import React, { ReactNode, useEffect, useMemo, useRef } from "react";
import { animate } from "framer-motion";

type Props = {
  children: ReactNode;
  headerOffsetPx?: number;
  durationMs?: number;
};

export function SectionScrollContainer({
  children,
  headerOffsetPx = 80,
  durationMs = 680,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    index: 0,
    isAnimating: false,
    wheelAcc: 0,
    lastWheelTs: 0,
    sectionTops: [] as number[],
    stopAnim: null as null | (() => void),
    cooldownUntil: 0,
  });

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const measure = () => {
    const root = rootRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-section]"));
    const tops = sections.map((el) => el.offsetTop);

    stateRef.current.sectionTops = tops;

    const st = root.scrollTop;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < tops.length; i++) {
      const d = Math.abs(tops[i] - st);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    stateRef.current.index = nearest;
  };

  // fast start, slow end (easing)
  const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

  const animateScrollTo = (targetTop: number) => {
    const root = rootRef.current;
    if (!root) return;

    // стоп предыдущей анимации
    stateRef.current.stopAnim?.();
    stateRef.current.stopAnim = null;

    const from = root.scrollTop;
    const to = targetTop;

    if (prefersReducedMotion) {
      root.scrollTop = to;
      stateRef.current.isAnimating = false;
      stateRef.current.wheelAcc = 0;
      return;
    }

    stateRef.current.isAnimating = true;

    const controls = animate(from, to, {
      duration: durationMs / 1000,
      ease: easeOutQuint, // быстрый старт, мягкий конец
      onUpdate: (v) => {
        root.scrollTop = v;
      },
      onComplete: () => {
        stateRef.current.isAnimating = false;
        stateRef.current.wheelAcc = 0;
      },
    });

    stateRef.current.stopAnim = () => {
      controls.stop();
      stateRef.current.isAnimating = false;
      stateRef.current.wheelAcc = 0;
    };
  };

  const scrollToIndex = (nextIndex: number) => {
    const root = rootRef.current;
    const tops = stateRef.current.sectionTops;
    if (!root || tops.length === 0) return;

    const clamped = Math.max(0, Math.min(nextIndex, tops.length - 1));
    if (clamped === stateRef.current.index) return;

    stateRef.current.index = clamped;

    const target = Math.max(0, tops[clamped] - headerOffsetPx);
    animateScrollTo(target);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

    measure();

    const onWheel = (e: WheelEvent) => {
      // если внутри секции есть скроллящийся блок — не трогаем
      const target = e.target as HTMLElement | null;
      if (target) {
        const scrollable = target.closest("[data-scrollable]");
        if (scrollable) return;
      }

      // на мобилках оставим нативный
      if (isCoarsePointer) return;

      const now = performance.now();

      // игнорируем wheel во время "послеанимационной" инерции трекпада
      if (now < stateRef.current.cooldownUntil) {
        e.preventDefault();
        return;
      }

      if (stateRef.current.isAnimating) {
        e.preventDefault();
        return;
      }

      const dt = now - stateRef.current.lastWheelTs;

      // если пауза — сбрасываем аккумулятор
      const RESET_MS = 160;
      if (dt > RESET_MS) stateRef.current.wheelAcc = 0;

      stateRef.current.lastWheelTs = now;
      stateRef.current.wheelAcc += e.deltaY;

      // для Mac trackpad нужен порог выше
      const THRESHOLD = 120;

      if (Math.abs(stateRef.current.wheelAcc) < THRESHOLD) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const dir = stateRef.current.wheelAcc > 0 ? 1 : -1;

      // перед переходом — сброс аккумулятора
      stateRef.current.wheelAcc = 0;

      // важное: ставим cooldown, чтобы инерция не "продавила" ещё один переход
      const COOLDOWN_MS = 520;
      stateRef.current.cooldownUntil = now + COOLDOWN_MS;

      scrollToIndex(stateRef.current.index + dir);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.isAnimating) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        scrollToIndex(stateRef.current.index + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToIndex(stateRef.current.index - 1);
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    window.addEventListener("resize", measure);

    return () => {
      root.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("keydown", onKeyDown);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      stateRef.current.stopAnim?.();
    };
  }, [durationMs, headerOffsetPx, prefersReducedMotion]);

  return (
    <div
      ref={rootRef}
      className="h-screen overflow-y-auto"
      style={{
        // iOS инерция
        WebkitOverflowScrolling: "touch",
        // чтобы скроллбар/over-scroll не прыгал
        overscrollBehavior: "none",
      }}
    >
      {children}
    </div>
  );
}

