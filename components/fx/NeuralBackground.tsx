"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo de "red neuronal": nodos que flotan y se conectan con líneas cuando están cerca.
 * Canvas liviano (requestAnimationFrame), se adapta al tamaño del contenedor padre.
 * Decorativo: pointer-events: none.
 */
export function NeuralBackground({ density = 42, color = "34,211,238", accent = "167,139,250" }: { density?: number; color?: string; accent?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cv = canvas; // refs no-null para las clausuras
    const c2d = ctx;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, lastDraw = 0, visible = true, inView = true;
    const FRAME_MS = 1000 / 14; // ~14 fps: fluido y liviano
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    type P = { x: number; y: number; vx: number; vy: number; a: boolean };
    let pts: P[] = [];

    function resize() {
      const parent = cv.parentElement;
      if (!parent) return;
      w = parent.clientWidth; h = parent.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(14, Math.round((w * h) / 22000));
      const count = Math.min(density, n);
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        a: Math.random() < 0.25,
      }));
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || !inView) return;
      const now = performance.now();
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      c2d.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      // líneas
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            const op = (1 - d2 / (130 * 130)) * 0.5;
            c2d.strokeStyle = `rgba(${color},${op.toFixed(3)})`;
            c2d.lineWidth = 1;
            c2d.beginPath(); c2d.moveTo(pts[i].x, pts[i].y); c2d.lineTo(pts[j].x, pts[j].y); c2d.stroke();
          }
        }
      }
      // nodos
      for (const p of pts) {
        c2d.beginPath();
        c2d.fillStyle = `rgba(${p.a ? accent : color},0.9)`;
        c2d.arc(p.x, p.y, p.a ? 2.2 : 1.4, 0, Math.PI * 2);
        c2d.fill();
      }
    }

    function frameOnce() { c2d.clearRect(0, 0, w, h); for (const p of pts) { c2d.beginPath(); c2d.fillStyle = `rgba(${p.a ? accent : color},0.9)`; c2d.arc(p.x, p.y, p.a ? 2.2 : 1.4, 0, Math.PI * 2); c2d.fill(); } }

    resize();
    if (reduce) { frameOnce(); } // un cuadro estático, sin bucle
    else raf = requestAnimationFrame(frame);
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver((es) => { inView = es[0]?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(cv);
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [density, color, accent]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-60" aria-hidden />;
}
