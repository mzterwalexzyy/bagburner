"use client";

import { useRef, useState } from "react";

/**
 * Subtle 3D tilt-on-hover wrapper. Uses inline styles exclusively (not Tailwind
 * transform utilities) so it can never collide with other transform-based effects
 * elsewhere on the page, and works reliably regardless of build-tool quirks.
 */
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = 6;
    setStyle({
      transform: `perspective(800px) rotateX(${(-y * maxTilt).toFixed(2)}deg) rotateY(${(x * maxTilt).toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`,
      transition: "transform 60ms ease-out",
    });
  }

  function handleMouseLeave() {
    setStyle({ transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)", transition: "transform 300ms ease-out" });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, willChange: "transform" }}
      className={className}
    >
      {children}
    </div>
  );
}
