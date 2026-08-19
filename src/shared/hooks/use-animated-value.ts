import { useState, useEffect, useRef } from "react";

/**
 * Hook to animate a numeric value from previous to new value
 * Similar to the counter animation in wallet
 */
export function useAnimatedValue(targetValue: number, duration: number = 300) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const valueRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const target = Number(targetValue);
    const currentAnimated = Number(animatedValue);
    
    // Check if we need to animate
    const shouldAnimate = !hasAnimatedRef.current || target !== valueRef.current;
    
    if (shouldAnimate) {
      const previousValue = valueRef.current;
      valueRef.current = target;
      hasAnimatedRef.current = true;
      
      // For first load, start from 0, otherwise start from previous animated value
      const startValue = previousValue === null ? 0 : currentAnimated;
      const endValue = target;
      
      // Only animate if there's a difference
      if (startValue !== endValue) {
        setAnimatedValue(startValue);
        
        const startTime = Date.now();

        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          const currentValue = startValue + (endValue - startValue) * easeOutCubic;
          
          setAnimatedValue(currentValue);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setAnimatedValue(endValue);
          }
        };

        requestAnimationFrame(animate);
      } else {
        setAnimatedValue(endValue);
      }
    }
  }, [targetValue, duration]);

  return animatedValue;
}


