"use client";

import { useEffect, useRef } from "react";

/** Halo suave que sigue el cursor (solo en dispositivos con mouse fino). Decorativo. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return; // nada en táctiles
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "1";
    let raf = 0, x = 0, y = 0;
    const onMove = (e: MouseEvent) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => { el.style.transform = `translate3d(${x - 160}px, ${y - 160}px, 0)`; raf = 0; });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[320px] w-[320px] rounded-full opacity-0 transition-opacity duration-500 mix-blend-screen"
      style={{ background: "radial-gradient(circle, rgba(34,211,238,0.10), rgba(167,139,250,0.06) 40%, transparent 70%)" }}
    />
  );
}
