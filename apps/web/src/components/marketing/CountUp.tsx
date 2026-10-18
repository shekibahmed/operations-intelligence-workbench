"use client";

import { useEffect, useRef } from "react";

interface CountUpProps {
  /** Final value; always what server rendering, assistive tech and reduced-motion users see. */
  value: number;
  decimals?: number;
  durationMs?: number;
}

/**
 * Counts from 0 to `value` once the figure scrolls into view. Animates only
 * when `IntersectionObserver` exists and reduced motion is not requested;
 * otherwise the final value simply stays on screen. The animated digits are
 * `aria-hidden`; the final value is always present in an `sr-only` span.
 */
export function CountUp({ value, decimals = 0, durationMs = 1200 }: CountUpProps) {
  const digitsRef = useRef<HTMLSpanElement>(null);
  const finalText = value.toFixed(decimals);

  useEffect(() => {
    const node = digitsRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    node.textContent = (0).toFixed(decimals);
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        node.textContent = (value * eased).toFixed(decimals);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = finalText;
    };
  }, [value, decimals, durationMs, finalText]);

  return (
    <>
      <span className="sr-only">{finalText}</span>
      <span ref={digitsRef} aria-hidden="true">
        {finalText}
      </span>
    </>
  );
}
