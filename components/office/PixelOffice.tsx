"use client";

import { useEffect, useRef } from "react";
import { useDeck } from "@/lib/store";

/**
 * Oficina PIXEL-ART animada (canvas, sin assets externos). Cada agente es un personaje
 * con headset que teclea, parpadea y muestra su tarea en una burbuja. ATLAS en la
 * oficina central destacada. Click en un puesto → entra a esa área.
 */
type Worker = { name: string; color: string; task: string; working: boolean; area: string };

export function PixelOffice() {
  const ref = useRef<HTMLCanvasElement>(null);
  const setArea = useDeck((s) => s.setArea);
  const agents = useDeck((s) => s.agents);
  const areaAgents = useDeck((s) => s.areaAgents);
  const agentEnabled = useDeck((s) => s.agentEnabled);

  // Datos vivos en un ref para no recrear el loop
  const dataRef = useRef<{ workers: Worker[]; atlas: Worker }>({ workers: [], atlas: { name: "ATLAS", color: "#E8C766", task: "", working: true, area: "hq" } });
  useEffect(() => {
    const en = agentEnabled;
    const commercial: Worker[] = agents.filter((a) => a.id !== "director").map((a) => ({ name: a.name, color: a.color, task: a.currentTask ?? a.role, working: en[a.id] !== false && a.status !== "idle", area: "comercial" }));
    const areaW: Worker[] = (["marketing", "ingenieria", "directiva", "rrhh"] as const).flatMap((ar) =>
      (areaAgents[ar] ?? []).slice(0, 1).map((a) => ({ name: a.name, color: a.color, task: a.task ?? a.role, working: en[a.id] !== false && a.mode !== "idle", area: ar }))
    );
    const director = agents.find((a) => a.id === "director");
    dataRef.current = {
      workers: [...commercial, ...areaW].slice(0, 12),
      atlas: { name: director?.name ?? "ATLAS", color: "#E8C766", task: director?.currentTask ?? "Coordinando la compañía", working: true, area: "hq" },
    };
  }, [agents, areaAgents, agentEnabled]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const cv = canvas, c2d = ctx;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, frame = 0, W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stations: { x: number; y: number; w: number; h: number; area: string }[] = [];

    function resize() {
      const parent = cv.parentElement; if (!parent) return;
      W = parent.clientWidth; H = Math.max(420, Math.round(W * 0.52));
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d.imageSmoothingEnabled = false;
    }

    const U = (n: number) => Math.round(n);
    function rect(x: number, y: number, w: number, h: number, col: string) { c2d.fillStyle = col; c2d.fillRect(U(x), U(y), U(w), U(h)); }

    function drawFloor() {
      // pared superior
      rect(0, 0, W, 78, "#2b2f3a");
      for (let x = 0; x < W; x += 18) rect(x, 0, 1, 78, "#262a34");
      // piso
      const tile = 34;
      for (let y = 78; y < H; y += tile) for (let x = 0; x < W; x += tile) {
        rect(x, y, tile, tile, ((x / tile + y / tile) | 0) % 2 ? "#3a3327" : "#413a2c");
        rect(x, y, tile, 1, "#332d22"); rect(x, y, 1, tile, "#332d22");
      }
    }

    function drawWallDecor() {
      // ventana con cielo
      const wx = W * 0.5 - 60;
      rect(wx - 3, 12, 126, 50, "#1a1d26");
      const sky = c2d.createLinearGradient(0, 12, 0, 62); sky.addColorStop(0, "#1e3a5f"); sky.addColorStop(1, "#0e1b2e");
      c2d.fillStyle = sky; c2d.fillRect(U(wx), 14, 120, 46);
      for (let i = 0; i < 6; i++) rect(wx + 8 + i * 19, 40 - (i % 3) * 8, 12, 20 + (i % 3) * 8, "#0a1422");
      for (let i = 0; i < 14; i++) rect(wx + 12 + (i * 13) % 110, 22 + (i * 7) % 20, 2, 2, "#9fd0ff");
      rect(wx + 58, 14, 2, 46, "#1a1d26"); rect(wx - 3, 36, 126, 2, "#1a1d26");
      // reloj con manecilla real
      const cxk = W * 0.5 + 92, cyk = 38;
      c2d.beginPath(); c2d.fillStyle = "#e7e7ee"; c2d.arc(cxk, cyk, 14, 0, Math.PI * 2); c2d.fill();
      c2d.strokeStyle = "#2b2f3a"; c2d.lineWidth = 2; c2d.beginPath(); c2d.arc(cxk, cyk, 14, 0, Math.PI * 2); c2d.stroke();
      const ang = (frame / 60) % (Math.PI * 2);
      c2d.strokeStyle = "#2b2f3a"; c2d.beginPath(); c2d.moveTo(cxk, cyk); c2d.lineTo(cxk + Math.cos(ang) * 9, cyk + Math.sin(ang) * 9); c2d.stroke();
      // dispensador de agua
      const dx = W * 0.5 - 120; rect(dx, 26, 18, 10, "#bfe6ff"); rect(dx + 2, 36, 14, 22, "#dfeefc"); rect(dx + 4, 58, 10, 6, "#8aa0b8");
      // cuadro "empleado del mes"
      const ex = W * 0.5 - 200; rect(ex, 16, 40, 46, "#caa14a"); rect(ex + 3, 19, 34, 30, "#19324f"); rect(ex + 14, 26, 12, 12, "#f0c089"); rect(ex + 10, 50, 20, 8, "#caa14a");
    }

    function drawCharacterDesk(cx: number, topY: number, w: Worker, idx: number) {
      const bob = reduce ? 0 : Math.round(Math.sin(frame / 22 + idx) * 1.4);
      const deskW = 86, deskX = cx - deskW / 2, deskY = topY + 44;
      // silla
      rect(cx - 12, deskY - 6, 24, 10, "#22262f");
      // personaje (vista trasera) con headset
      const py = topY + 14 + bob;
      rect(cx - 13, py + 16, 26, 16, w.color); // hombros/camisa
      rect(cx - 11, py + 2, 22, 18, "#3a2c22"); // cabeza/pelo (atrás)
      rect(cx - 13, py + 4, 4, 12, "#1b2430"); rect(cx + 9, py + 4, 4, 12, "#1b2430"); // earcups headset
      rect(cx - 11, py, 22, 4, "#1b2430"); // banda headset
      // monitor
      const mY = deskY - 30;
      rect(cx - 24, mY, 48, 30, "#0b0e16"); // bezel
      const scr = w.working ? "#0e1726" : "#10131c";
      rect(cx - 21, mY + 3, 42, 24, scr);
      // líneas de código animadas
      if (w.working) {
        const palette = ["#5ad1ff", "#a78bfa", "#34d399", "#fbbf24"];
        for (let i = 0; i < 4; i++) {
          const len = 8 + ((frame / 6 + i * 9 + idx * 5) % 28);
          rect(cx - 18, mY + 6 + i * 5, len, 2, palette[(i + idx) % palette.length]);
        }
        // cursor parpadeante
        if (((frame >> 4) & 1) === 0) rect(cx - 18 + 22, mY + 6 + ((frame / 30 | 0) % 4) * 5, 2, 2, "#fff");
      } else {
        rect(cx - 16, mY + 12, 26, 2, "#2a3040");
      }
      rect(cx - 6, mY + 30, 12, 4, "#0b0e16"); // pie monitor
      // escritorio
      rect(deskX, deskY, deskW, 8, "#6b4b2a"); rect(deskX, deskY + 8, 4, 14, "#553c22"); rect(deskX + deskW - 4, deskY + 8, 4, 14, "#553c22");
      rect(deskX + 6, deskY - 4, 16, 4, "#1b2430"); // teclado
      // manos tecleando
      if (w.working && !reduce) { const up = (frame >> 3) & 1; rect(cx - 10, deskY - 6 - up, 5, 5, "#f0c089"); rect(cx + 5, deskY - 6 - (up ^ 1), 5, 5, "#f0c089"); }
      rect(deskX + deskW - 14, deskY - 5, 6, 6, "#cfe8ff"); // taza
      // nombre + estado
      c2d.fillStyle = "#eaf0ff"; c2d.font = "600 11px ui-sans-serif, system-ui"; c2d.textAlign = "center";
      c2d.fillText(w.name, cx, topY + 8);
      c2d.fillStyle = w.working ? "#34D399" : "#5A678C"; c2d.beginPath(); c2d.arc(cx + c2d.measureText(w.name).width / 2 + 7, topY + 4, 3, 0, Math.PI * 2); c2d.fill();
      // burbuja con tarea
      if (w.working) bubble(cx, mY - 8, w.task);
      stations.push({ x: deskX, y: topY, w: deskW, h: deskY + 22 - topY, area: w.area });
    }

    function bubble(cx: number, by: number, text: string) {
      const t = (text || "").slice(0, 26);
      c2d.font = "500 9px ui-monospace, monospace";
      const tw = Math.min(150, c2d.measureText(t).width + 14);
      const bx = cx - tw / 2;
      c2d.fillStyle = "rgba(12,18,30,0.92)"; roundRect(bx, by - 16, tw, 16, 4); c2d.fill();
      c2d.strokeStyle = "rgba(90,103,140,0.5)"; c2d.lineWidth = 1; c2d.stroke();
      c2d.fillStyle = "#9fb2d6"; c2d.beginPath(); c2d.moveTo(cx - 3, by); c2d.lineTo(cx + 3, by); c2d.lineTo(cx, by + 4); c2d.fill();
      c2d.fillStyle = "#cfe0ff"; c2d.textAlign = "center"; c2d.fillText(t, cx, by - 5);
    }
    function roundRect(x: number, y: number, w: number, h: number, r: number) { c2d.beginPath(); c2d.moveTo(x + r, y); c2d.arcTo(x + w, y, x + w, y + h, r); c2d.arcTo(x + w, y + h, x, y + h, r); c2d.arcTo(x, y + h, x, y, r); c2d.arcTo(x, y, x + w, y, r); c2d.closePath(); }

    function drawAtlas(cx: number, topY: number, w: Worker) {
      const aw = 150, ax = cx - aw / 2;
      // alfombra/oficina destacada
      c2d.fillStyle = "rgba(232,199,102,0.07)"; c2d.fillRect(U(ax - 14), U(topY - 6), aw + 28, 96);
      c2d.strokeStyle = "rgba(232,199,102,0.55)"; c2d.lineWidth = 2; c2d.strokeRect(U(ax - 14), U(topY - 6), aw + 28, 96);
      drawCharacterDesk(cx, topY, w, 99);
      c2d.fillStyle = "#E8C766"; c2d.font = "700 10px ui-sans-serif"; c2d.textAlign = "center";
      c2d.fillText("ORQUESTADOR", cx, topY + 86);
    }

    function loop() {
      stations = [];
      c2d.clearRect(0, 0, W, H);
      drawFloor();
      drawWallDecor();
      const ws = dataRef.current.workers;
      const cols = Math.max(3, Math.min(5, Math.floor(W / 150)));
      const colW = W / cols;
      ws.forEach((w, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        drawCharacterDesk(colW * col + colW / 2, 100 + row * 120, w, i);
      });
      drawAtlas(W / 2, H - 104, dataRef.current.atlas);
      frame++;
      if (!reduce) raf = requestAnimationFrame(loop);
    }

    function onClick(e: MouseEvent) {
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = stations.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
      if (hit) setArea(hit.area as any);
    }

    resize(); loop(); if (reduce) loop();
    cv.addEventListener("click", onClick);
    cv.style.cursor = "pointer";
    const ro = new ResizeObserver(() => { resize(); if (reduce) loop(); });
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("click", onClick); };
  }, [setArea]);

  return (
    <div className="panel overflow-hidden p-2">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        <p className="text-[13px] font-semibold text-text">Oficina en vivo · agentes trabajando</p>
        <span className="ml-auto text-[10px] text-text-dim">toca un puesto para entrar a su área</span>
      </div>
      <div className="overflow-hidden rounded-xl">
        <canvas ref={ref} className="block w-full" />
      </div>
    </div>
  );
}
