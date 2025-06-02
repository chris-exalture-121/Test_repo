import { useEffect, useState } from "react";

/**
 * A custom React hook that simulates a progress bar with exponential increase and decrease.
 *
 * @param duration - The duration of the loading process in milliseconds.
 * @param allowFullLoading - If true, allows the progress bar to reach 100% regardless of the loading duration.
 * @returns The current progress value.
 */
export const useProgress = (duration: number, allowExceed: boolean = false) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;

      if (elapsedTime >= duration) {
        setProgress(allowExceed ? 100 : 95);
        return;
      }

      const normalizedTime = elapsedTime / duration;
      let newProgress;

      if (normalizedTime <= 0.5) {
        // Fast progress from 0 to 50
        newProgress = Math.round(normalizedTime * 100);
      } else if (normalizedTime <= 0.7) {
        // Slow progress from 50 to 70
        newProgress = Math.round(50 + (normalizedTime - 0.5) * 40);
      } else {
        // Very slow progress from 70 to 100
        newProgress = Math.round(70 + (normalizedTime - 0.7) * 30);
      }

      if (allowExceed || newProgress <= 95) {
        setProgress(newProgress);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [duration, allowExceed]);

  return progress;
};
