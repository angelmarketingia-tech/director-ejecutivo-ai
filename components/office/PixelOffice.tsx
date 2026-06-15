"use client";

import { useEffect, useRef, useState } from "react";
import { useDeck } from "@/lib/store";
import { AREA_BY_ID } from "@/lib/departments";
import { Pencil, Check } from "lucide-react";

/**
 * Oficina PIXEL-ART de lujo (canvas). Salas divididas por área, ventanal panorámico tipo
 * penthouse de Silicon Valley con día/noche según la hora local, TV, muebles y personajes
 * con detalles únicos. Nombres editables. Click en una sala → entra al área.
 */
type Worker = { id: string; name: string; color: string; task: string; working: boolean };
type Room = { area: string; label: string; color: string; workers: Worker[] };

const HAIR = ["#2b2017", "#6b4b2a", "#141414", "#caa14a", "#7a3b1f", "#23233a", "#8a8f9c"];
const SKIN = ["#f1c9a0", "#e0a878", "#c68642", "#8d5524", "#ffd9b3"];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export function PixelOffice() {
  const ref = useRef<HTMLCanvasElement>(null);
  const setArea = useDeck((s) => s.setArea);
  const agents = useDeck((s) => s.agents);
  const areaAgents = useDeck((s) => s.areaAgents);
  const agentEnabled = useDeck((s) => s.agentEnabled);

  const [names, setNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    try { setNames(JSON.parse(localStorage.getItem("agentNames") || "{}")); } catch {}
  }, []);
  function rename(id: string, v: string) {
    const next = { ...names, [id]: v };
    setNames(next);
    try { localStorage.setItem("agentNames", JSON.stringify(next)); } catch {}
  }
  const nm = (id: string, def: string) => (names[id]?.trim() ? names[id] : def);

  // Lista editable
  const editList = [
    ...agents.filter((a) => a.id !== "director").map((a) => ({ id: a.id, def: a.name })),
    ...agents.filter((a) => a.id === "director").map((a) => ({ id: a.id, def: a.name })),
    ...(["marketing", "ingenieria", "directiva", "rrhh"] as const).flatMap((ar) => (areaAgents[ar] ?? []).map((a) => ({ id: a.id, def: a.name }))),
  ];

  const dataRef = useRef<{ rooms: Room[]; atlas: Worker }>({ rooms: [], atlas: { id: "director", name: "ATLAS", color: "#E8C766", task: "", working: true } });
  useEffect(() => {
    const en = agentEnabled;
    const commercial = agents.filter((a) => a.id !== "director").map((a) => ({ id: a.id, name: nm(a.id, a.name), color: a.color, task: a.currentTask ?? a.role, working: en[a.id] !== false && a.status !== "idle" }));
    const dept = (ar: "marketing" | "ingenieria" | "directiva" | "rrhh") => (areaAgents[ar] ?? []).map((a) => ({ id: a.id, name: nm(a.id, a.name), color: a.color, task: a.task ?? a.role, working: en[a.id] !== false && a.mode !== "idle" }));
    const meta = (id: string) => AREA_BY_ID[id as keyof typeof AREA_BY_ID];
    dataRef.current = {
      rooms: [
        { area: "comercial", label: "Comercial", color: meta("comercial").color, workers: commercial.slice(0, 4) },
        { area: "marketing", label: "Marketing", color: meta("marketing").color, workers: dept("marketing").slice(0, 4) },
        { area: "ingenieria", label: "Desarrollo", color: meta("ingenieria").color, workers: dept("ingenieria").slice(0, 4) },
        { area: "directiva", label: "Directiva", color: meta("directiva").color, workers: dept("directiva").slice(0, 4) },
        { area: "rrhh", label: "Recursos Humanos", color: meta("rrhh").color, workers: dept("rrhh").slice(0, 4) },
      ],
      atlas: { id: "director", name: nm("director", agents.find((a) => a.id === "director")?.name ?? "ATLAS"), color: "#E8C766", task: agents.find((a) => a.id === "director")?.currentTask ?? "Coordinando la compañía", working: true },
    };
  }, [agents, areaAgents, agentEnabled, names]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const cv = canvas, c2d = ctx;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, frame = 0, W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let hits: { x: number; y: number; w: number; h: number; area: string }[] = [];

    const R = (x: number, y: number, w: number, h: number, c: string) => { c2d.fillStyle = c; c2d.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function layout() {
      const parent = cv.parentElement; if (!parent) return { cols: 2, rowH: 0, winH: 0, rows: 0 };
      W = parent.clientWidth;
      const cols = W > 1000 ? 3 : W > 680 ? 2 : 1;
      const rooms = 6; // 5 áreas + ATLAS
      const rows = Math.ceil(rooms / cols);
      const winH = Math.round(Math.min(150, W * 0.13));
      const rowH = 210;
      H = winH + rows * rowH;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0); c2d.imageSmoothingEnabled = false;
      return { cols, rowH, winH, rows };
    }

    function dayState() {
      const hr = new Date().getHours();
      if (hr >= 7 && hr < 17) return "day";
      if (hr >= 17 && hr < 20) return "dusk";
      return "night";
    }

    function drawWindow(winH: number) {
      const st = dayState();
      const g = c2d.createLinearGradient(0, 0, 0, winH);
      if (st === "day") { g.addColorStop(0, "#6fb0ea"); g.addColorStop(1, "#cfe7ff"); }
      else if (st === "dusk") { g.addColorStop(0, "#34507e"); g.addColorStop(0.6, "#c97a52"); g.addColorStop(1, "#f0b27a"); }
      else { g.addColorStop(0, "#070d1f"); g.addColorStop(1, "#16264a"); }
      c2d.fillStyle = g; c2d.fillRect(0, 0, W, winH);

      // sol / luna
      const bx = W * 0.82, by = winH * 0.42;
      if (st === "night") { R(bx, by, 22, 22, "#e9eef7"); R(bx + 14, by - 4, 10, 10, st === "night" ? "#16264a" : "#000"); }
      else { c2d.fillStyle = st === "dusk" ? "#ffd089" : "#fff3c4"; c2d.beginPath(); c2d.arc(bx, by, 16, 0, Math.PI * 2); c2d.fill(); }
      // estrellas
      if (st !== "day") for (let i = 0; i < 40; i++) { const sx = (i * 71) % W, sy = (i * 37) % (winH * 0.7); if (((i * 13) % 5) === 0) R(sx, sy, 1, 1, "#cfe0ff"); }
      // nubes (día) que se desplazan
      if (st === "day") for (let i = 0; i < 3; i++) { const cxc = (frame / (40 + i * 10) + i * 220) % (W + 120) - 60; R(cxc, winH * 0.25 + i * 10, 46, 8, "rgba(255,255,255,0.7)"); R(cxc + 12, winH * 0.25 + i * 10 - 5, 30, 8, "rgba(255,255,255,0.8)"); }

      // skyline (edificios) con ventanas
      const lit = st !== "day";
      for (let i = 0, x = 0; x < W; i++, x += 46 + (i % 3) * 10) {
        const bh = 30 + ((i * 53) % 60), bw = 34 + (i % 3) * 8;
        R(x, winH - bh, bw, bh, lit ? "#0b1530" : "#3f5b86");
        for (let wy = winH - bh + 6; wy < winH - 6; wy += 9)
          for (let wx = x + 4; wx < x + bw - 4; wx += 8)
            R(wx, wy, 4, 5, lit ? (((wx + wy + i) % 3) ? "#0b1530" : "#ffd36b") : "#cfe0ff");
      }
      // marco/mullions del ventanal (penthouse)
      R(0, winH - 3, W, 6, "#1b1f2a");
      for (let x = 0; x < W; x += 150) R(x, 0, 5, winH, "#1b1f2a");
      R(0, 0, W, 4, "#1b1f2a");
    }

    function character(cx: number, py: number, w: Worker, idx: number) {
      const h = hash(w.id || w.name);
      const skin = SKIN[h % SKIN.length], hair = HAIR[(h >> 3) % HAIR.length], glasses = (h % 3) === 0;
      const bob = reduce ? 0 : Math.round(Math.sin(frame / 22 + idx) * 1.3);
      const y = py + bob;
      R(cx - 14, y + 17, 28, 16, w.color);            // hombros (camisa = color del agente)
      R(cx - 12, y + 2, 24, 18, hair);                 // cabeza (atrás, pelo)
      R(cx - 11, y + 13, 22, 5, skin);                 // cuello/nuca
      R(cx - 14, y + 5, 4, 12, "#15202f"); R(cx + 10, y + 5, 4, 12, "#15202f"); // earcups
      R(cx - 12, y, 24, 4, "#15202f");                 // banda headset
      if (glasses) { R(cx - 10, y + 12, 8, 1, "#cfe0ff"); R(cx + 2, y + 12, 8, 1, "#cfe0ff"); }
      return { bob };
    }

    function deskUnit(cx: number, topY: number, w: Worker, idx: number) {
      const deskY = topY + 46, deskW = 70, deskX = cx - deskW / 2;
      R(cx - 11, deskY - 6, 22, 9, "#22262f");          // silla
      character(cx, topY + 12, w, idx);
      // monitor
      const mY = deskY - 28;
      R(cx - 21, mY, 42, 27, "#0a0d15");
      R(cx - 18, mY + 3, 36, 21, w.working ? "#0e1726" : "#111521");
      if (w.working) {
        const pal = ["#5ad1ff", "#a78bfa", "#34d399", "#fbbf24"];
        for (let i = 0; i < 3; i++) { const len = 6 + ((frame / 6 + i * 8 + idx * 4) % 24); R(cx - 15, mY + 6 + i * 6, len, 2, pal[(i + idx) % 4]); }
        if (((frame >> 4) & 1) === 0) R(cx + 6, mY + 6 + ((frame / 30 | 0) % 3) * 6, 2, 2, "#fff");
      }
      R(cx - 5, mY + 27, 10, 4, "#0a0d15");
      R(deskX, deskY, deskW, 7, "#6b4b2a"); R(deskX, deskY + 7, 3, 12, "#553c22"); R(deskX + deskW - 3, deskY + 7, 3, 12, "#553c22");
      R(deskX + 6, deskY - 4, 14, 3, "#15202f");        // teclado
      if (w.working && !reduce) { const up = (frame >> 3) & 1; R(cx - 9, deskY - 5 - up, 4, 4, "#f0c089"); R(cx + 5, deskY - 5 - (up ^ 1), 4, 4, "#f0c089"); }
      R(deskX + deskW - 12, deskY - 5, 5, 6, "#cfe8ff"); // taza
      // nombre + estado
      c2d.fillStyle = "#eaf0ff"; c2d.font = "600 10px ui-sans-serif, system-ui"; c2d.textAlign = "center";
      c2d.fillText(w.name, cx, topY + 8);
      c2d.fillStyle = w.working ? "#34D399" : "#5A678C"; c2d.beginPath(); c2d.arc(cx + c2d.measureText(w.name).width / 2 + 6, topY + 4, 2.5, 0, Math.PI * 2); c2d.fill();
      if (w.working) bubble(cx, mY - 6, w.task);
    }

    function bubble(cx: number, by: number, text: string) {
      const t = (text || "").slice(0, 24);
      c2d.font = "500 8px ui-monospace, monospace";
      const tw = Math.min(140, c2d.measureText(t).width + 12);
      c2d.fillStyle = "rgba(10,15,26,0.92)"; rr(cx - tw / 2, by - 15, tw, 15, 4); c2d.fill();
      c2d.strokeStyle = "rgba(90,103,140,0.45)"; c2d.lineWidth = 1; c2d.stroke();
      c2d.fillStyle = "#cfe0ff"; c2d.textAlign = "center"; c2d.fillText(t, cx, by - 5);
    }
    const rr = (x: number, y: number, w: number, h: number, r: number) => { c2d.beginPath(); c2d.moveTo(x + r, y); c2d.arcTo(x + w, y, x + w, y + h, r); c2d.arcTo(x + w, y + h, x, y + h, r); c2d.arcTo(x, y + h, x, y, r); c2d.arcTo(x, y, x + w, y, r); c2d.closePath(); };

    function decor(kind: string, rx: number, ry: number, rw: number, rh: number, color: string) {
      // planta esquina
      R(rx + 8, ry + rh - 20, 8, 10, "#5a3a1f"); R(rx + 5, ry + rh - 30, 14, 12, "#2f7d4f"); R(rx + 8, ry + rh - 36, 8, 8, "#3a9a63");
      if (kind === "tv") { // TV de pared con gráfico
        const tx = rx + rw - 64, ty = ry + 26; R(tx, ty, 56, 32, "#0a0d15"); R(tx + 3, ty + 3, 50, 26, "#0e1726");
        for (let i = 0; i < 6; i++) { const bh = 4 + ((frame / 8 + i * 5) % 20); R(tx + 6 + i * 8, ty + 26 - bh, 5, bh, color); }
      } else if (kind === "sofa") { R(rx + rw - 60, ry + rh - 22, 46, 14, "#2a3650"); R(rx + rw - 60, ry + rh - 28, 46, 8, "#33425f"); }
      else if (kind === "board") { R(rx + rw - 58, ry + 24, 50, 30, "#101622"); R(rx + rw - 53, ry + 29, 40, 3, color); R(rx + rw - 53, ry + 36, 30, 3, "#5a678c"); R(rx + rw - 53, ry + 43, 36, 3, "#5a678c"); }
      else if (kind === "coffee") { R(rx + rw - 26, ry + rh - 24, 14, 16, "#222633"); R(rx + rw - 23, ry + rh - 20, 8, 6, "#3a4051"); }
    }

    function room(rx: number, ry: number, rw: number, rh: number, r: Room | null, atlas?: Worker) {
      const gold = !!atlas;
      const color = atlas ? "#E8C766" : r!.color;
      const label = atlas ? "ORQUESTADOR · ATLAS" : r!.label;
      // piso + paredes
      R(rx, ry, rw, rh, "#171a24");
      const tile = 26;
      for (let y = ry; y < ry + rh; y += tile) for (let x = rx; x < rx + rw; x += tile) { if (((x / tile + y / tile) | 0) % 2) R(x, y, tile, tile, "#1b2030"); }
      c2d.strokeStyle = gold ? "rgba(232,199,102,0.55)" : "rgba(148,163,184,0.22)"; c2d.lineWidth = gold ? 2 : 1; c2d.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      R(rx, ry, rw, 3, color + "");
      // letrero
      c2d.fillStyle = "rgba(10,15,26,0.85)"; rr(rx + 8, ry + 8, Math.min(rw - 16, label.length * 6.6 + 18), 16, 4); c2d.fill();
      c2d.fillStyle = color; c2d.beginPath(); c2d.arc(rx + 16, ry + 16, 3, 0, Math.PI * 2); c2d.fill();
      c2d.fillStyle = "#dfe8ff"; c2d.font = "700 9px ui-sans-serif"; c2d.textAlign = "left"; c2d.fillText(label.toUpperCase(), rx + 24, ry + 19);

      const ws = atlas ? [atlas] : r!.workers;
      // decoración por área
      decor(atlas ? "board" : ({ comercial: "board", marketing: "tv", ingenieria: "coffee", directiva: "sofa", rrhh: "coffee" } as any)[r!.area] || "coffee", rx, ry, rw, rh, color);
      // escritorios (2 columnas)
      const perRow = Math.min(2, Math.max(1, ws.length));
      ws.forEach((w, i) => {
        const col = i % perRow, rowi = Math.floor(i / perRow);
        const cellW = (rw - 24) / perRow;
        const cx = rx + 18 + cellW * col + cellW / 2 - 6;
        deskUnit(cx, ry + 40 + rowi * 86, w, i);
      });
      hits.push({ x: rx, y: ry, w: rw, h: rh, area: atlas ? "hq" : r!.area });
    }

    function loop() {
      const { cols, rowH, winH } = layout();
      hits = [];
      c2d.clearRect(0, 0, W, H);
      drawWindow(winH);
      const rooms = dataRef.current.rooms;
      const cellW = W / cols;
      // 5 áreas + ATLAS al final
      const all: ({ r: Room } | { atlas: Worker })[] = [...rooms.map((r) => ({ r })), { atlas: dataRef.current.atlas }];
      all.forEach((item, i) => {
        const col = i % cols, rowi = Math.floor(i / cols);
        const rx = cellW * col, ry = winH + rowi * rowH;
        if ("atlas" in item) room(rx + 4, ry + 4, cellW - 8, rowH - 8, null, item.atlas);
        else room(rx + 4, ry + 4, cellW - 8, rowH - 8, item.r);
      });
      // luz ambiente día/noche
      const st = dayState();
      c2d.fillStyle = st === "night" ? "rgba(10,20,55,0.16)" : st === "dusk" ? "rgba(255,170,90,0.05)" : "rgba(255,245,210,0.03)";
      c2d.fillRect(0, winH, W, H - winH);
      frame++;
      if (!reduce) raf = requestAnimationFrame(loop);
    }

    function onClick(e: MouseEvent) {
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = hits.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
      if (hit) setArea(hit.area as any);
    }

    layout(); loop(); if (reduce) loop();
    cv.addEventListener("click", onClick); cv.style.cursor = "pointer";
    const ro = new ResizeObserver(() => { layout(); if (reduce) loop(); });
    if (cv.parentElement) ro.observe(cv.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("click", onClick); };
  }, [setArea]);

  return (
    <div className="panel overflow-hidden p-2">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        <p className="text-[13px] font-semibold text-text">Oficina en vivo · penthouse</p>
        <button onClick={() => setEditing((v) => !v)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-muted hover:text-text">
          {editing ? <Check className="h-3.5 w-3.5 text-ok" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Listo" : "Editar nombres"}
        </button>
      </div>

      {editing && (
        <div className="mb-2 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/60 p-3 sm:grid-cols-3">
          {editList.map((a) => (
            <div key={a.id} className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wide text-text-dim">{a.def}</span>
              <input
                value={names[a.id] ?? ""}
                onChange={(e) => rename(a.id, e.target.value)}
                placeholder={a.def}
                className="rounded-md border border-border bg-bg-soft px-2 py-1 text-[11px] text-text outline-none focus:border-prospect/50"
              />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl">
        <canvas ref={ref} className="block w-full" />
      </div>
    </div>
  );
}
