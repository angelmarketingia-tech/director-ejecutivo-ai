"use client";

import { useEffect, useRef, useState } from "react";
import { useDeck } from "@/lib/store";
import { AREA_BY_ID } from "@/lib/departments";
import { drawAvatar, resolveLook, type Look } from "@/lib/avatar";
import { CharacterEditor } from "@/components/office/CharacterEditor";
import { Sparkles } from "lucide-react";

/**
 * Oficina PIXEL-ART de lujo (canvas). Salas divididas por área, ventanal panorámico tipo
 * penthouse de Silicon Valley con día/noche según la hora local, TV, muebles y personajes
 * con detalles únicos. Nombres editables. Click en una sala → entra al área.
 */
type Worker = { id: string; name: string; color: string; task: string; working: boolean };
type Room = { area: string; label: string; color: string; workers: Worker[] };

export function PixelOffice() {
  const ref = useRef<HTMLCanvasElement>(null);
  const setArea = useDeck((s) => s.setArea);
  const agents = useDeck((s) => s.agents);
  const areaAgents = useDeck((s) => s.areaAgents);
  const agentEnabled = useDeck((s) => s.agentEnabled);

  const [editing, setEditing] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [looks, setLooks] = useState<Record<string, Look>>({});
  const [role, setRole] = useState("member");
  const [meId, setMeId] = useState("");
  const looksRef = useRef<Record<string, Look>>({});
  useEffect(() => { looksRef.current = looks; }, [looks]);
  useEffect(() => {
    const loadTeam = () => fetch("/api/team").then((r) => r.json()).then((j) => { if (j.ok) setTeam(j.team); }).catch(() => {});
    loadTeam();
    fetch("/api/appearance").then((r) => r.json()).then((j) => { if (j.ok) { setLooks(j.looks || {}); setRole(j.role); setMeId(j.me || ""); } }).catch(() => {});
    const id = setInterval(loadTeam, 15000);
    return () => clearInterval(id);
  }, []);
  const nm = (id: string, def: string) => (looks[id]?.name?.trim() ? (looks[id].name as string) : def);

  // Lista de personajes editables (agentes + ATLAS + equipo Daptux)
  const editList = [
    ...agents.filter((a) => a.id !== "director").map((a) => ({ id: a.id, def: a.name, color: a.color })),
    ...agents.filter((a) => a.id === "director").map((a) => ({ id: a.id, def: a.name, color: "#E8C766" })),
    ...(["marketing", "ingenieria", "directiva", "rrhh"] as const).flatMap((ar) => (areaAgents[ar] ?? []).map((a) => ({ id: a.id, def: a.name, color: a.color }))),
    ...(["angel", "david", "andres", "juan"] as const).map((id) => ({ id, def: team.find((t) => t.id === id)?.name ?? id, color: id === "angel" || id === "david" ? "#E8C766" : "#22D3EE" })),
  ];

  type Daptux = { id: string; name: string; role: string; task: string; startedAt: number | null; color: string };
  const dataRef = useRef<{ rooms: Room[]; atlas: Worker; daptux: Daptux[] }>({ rooms: [], atlas: { id: "director", name: "ATLAS", color: "#E8C766", task: "", working: true }, daptux: [] });
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
      daptux: (["angel", "david", "andres", "juan"] as const).map((id) => {
        const m = team.find((x) => x.id === id);
        const color = id === "angel" || id === "david" ? "#E8C766" : "#22D3EE";
        return { id, name: m?.name ?? id, role: m?.role ?? (id === "angel" || id === "david" ? "CEO · Dirección" : "Programador creativo"), task: m?.current?.task ?? "", startedAt: m?.current?.startedAt ?? null, color };
      }),
    };
  }, [agents, areaAgents, agentEnabled, looks, team]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const cv = canvas, c2d = ctx;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, frame = 0, W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let hits: { x: number; y: number; w: number; h: number; area: string }[] = [];

    const R = (x: number, y: number, w: number, h: number, c: string) => { c2d.fillStyle = c; c2d.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    const ago = (ts: number | null) => {
      if (!ts) return "";
      const s = (Date.now() - ts) / 1000;
      if (s < 60) return Math.floor(s) + "s"; if (s < 3600) return Math.floor(s / 60) + "m"; if (s < 86400) return Math.floor(s / 3600) + "h"; return Math.floor(s / 86400) + "d";
    };

    function layout() {
      const parent = cv.parentElement; if (!parent) return { cols: 2, rowH: 0, winH: 0, rows: 0, daptuxH: 0 };
      W = parent.clientWidth;
      const cols = W > 1000 ? 3 : W > 680 ? 2 : 1;
      const rooms = 6; // 5 áreas + ATLAS
      const rows = Math.ceil(rooms / cols);
      const winH = Math.round(Math.min(150, W * 0.13));
      const daptuxH = W < 860 ? 300 : 224;
      const rowH = 210;
      H = winH + daptuxH + rows * rowH;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0); c2d.imageSmoothingEnabled = false;
      return { cols, rowH, winH, rows, daptuxH };
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
      const bob = reduce ? 0 : Math.round(Math.sin(frame / 22 + idx) * 1.3);
      drawAvatar(c2d, cx, py + bob, resolveLook(w.id, looksRef.current[w.id]), w.color, 1);
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

    function daptuxPerson(cx: number, topY: number, p: Daptux, idx: number, vip: boolean) {
      const working = !!p.startedAt;
      // zona VIP (alfombra dorada bajo el CEO)
      if (vip) { c2d.fillStyle = "rgba(232,199,102,0.10)"; rr(cx - 46, topY + 4, 92, 88, 8); c2d.fill(); c2d.strokeStyle = "rgba(232,199,102,0.45)"; c2d.lineWidth = 1; c2d.stroke(); }
      const deskY = topY + 52, deskW = 60, deskX = cx - deskW / 2;
      R(cx - 10, deskY - 6, 20, 9, "#22262f"); // silla
      character(cx, topY + 16, { id: p.id, name: p.name, color: p.color, task: p.task, working }, idx);
      // monitor
      const mY = deskY - 26; R(cx - 19, mY, 38, 24, "#0a0d15"); R(cx - 16, mY + 3, 32, 18, working ? "#0e1726" : "#111521");
      if (working) { const pal = ["#5ad1ff", "#a78bfa", "#34d399", "#fbbf24"]; for (let i = 0; i < 3; i++) { const len = 6 + ((frame / 6 + i * 7 + idx * 4) % 18); R(cx - 13, mY + 5 + i * 5, len, 2, pal[(i + idx) % 4]); } }
      R(cx - 4, mY + 24, 8, 4, "#0a0d15");
      // escritorio propio (dorado si VIP)
      R(deskX, deskY, deskW, 7, vip ? "#7a5a2a" : "#6b4b2a"); if (vip) R(deskX, deskY, deskW, 2, "#E8C766");
      R(deskX, deskY + 7, 3, 12, "#553c22"); R(deskX + deskW - 3, deskY + 7, 3, 12, "#553c22");
      if (working && !reduce) { const up = (frame >> 3) & 1; R(cx - 8, deskY - 5 - up, 4, 4, "#f0c089"); R(cx + 4, deskY - 5 - (up ^ 1), 4, 4, "#f0c089"); }
      // nombre (con estrella VIP) + rol
      c2d.fillStyle = "#eaf0ff"; c2d.font = "700 11px ui-sans-serif"; c2d.textAlign = "center"; c2d.fillText((vip ? "★ " : "") + p.name, cx, topY + 66);
      c2d.fillStyle = p.color; c2d.font = "600 7.5px ui-sans-serif"; c2d.fillText(p.role.toUpperCase(), cx, topY + 76);
      // burbuja: qué hace + hace cuánto (en vivo)
      const txt = working ? `${(p.task || "Trabajando").slice(0, 22)} · hace ${ago(p.startedAt)}` : "disponible";
      c2d.font = "500 8px ui-monospace, monospace";
      const tw = Math.min(150, c2d.measureText(txt).width + 12);
      c2d.fillStyle = working ? "rgba(12,30,22,0.95)" : "rgba(20,24,34,0.9)"; rr(cx - tw / 2, topY - 4, tw, 15, 4); c2d.fill();
      c2d.strokeStyle = working ? "rgba(52,211,153,0.5)" : "rgba(90,103,140,0.4)"; c2d.lineWidth = 1; c2d.stroke();
      c2d.fillStyle = working ? "#9af0c8" : "#8aa0c0"; c2d.textAlign = "center"; c2d.fillText(txt, cx, topY + 7);
    }

    function drawDaptux(top: number, h: number) {
      const rx = 6, ry = top + 6, rw = W - 12, rh = h - 12;
      const g = c2d.createLinearGradient(0, ry, 0, ry + rh); g.addColorStop(0, "#0f1626"); g.addColorStop(1, "#141d31");
      c2d.fillStyle = g; c2d.fillRect(rx, ry, rw, rh);
      const tile = 30; for (let y = ry; y < ry + rh; y += tile) for (let x = rx; x < rx + rw; x += tile) if (((x / tile + y / tile) | 0) % 2) R(x, y, tile, tile, "#101a2c");
      c2d.strokeStyle = "rgba(232,199,102,0.5)"; c2d.lineWidth = 2; c2d.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      c2d.fillStyle = "rgba(8,12,22,0.9)"; rr(rx + 12, ry + 10, 174, 20, 5); c2d.fill();
      c2d.fillStyle = "#E8C766"; c2d.font = "800 12px ui-sans-serif"; c2d.textAlign = "left"; c2d.fillText("🏢 OFICINA DAPTUX", rx + 20, ry + 24);

      const dx = dataRef.current.daptux;
      const ceos = dx.filter((p) => p.id === "angel" || p.id === "david");
      const devs = dx.filter((p) => p.id === "andres" || p.id === "juan");
      const baseY = ry + 60;
      if (W >= 860) {
        drawCluster(rx + rw * 0.27, baseY, "DIRECCIÓN", ceos, "#E8C766", true);
        drawCluster(rx + rw * 0.73, baseY, "PROGRAMADORES CREATIVOS", devs, "#22D3EE", false);
      } else {
        drawCluster(rx + rw * 0.5, baseY, "DIRECCIÓN", ceos, "#E8C766", true);
        drawCluster(rx + rw * 0.5, baseY + 118, "PROGRAMADORES CREATIVOS", devs, "#22D3EE", false);
      }
      hits.push({ x: rx, y: ry, w: rw, h: rh, area: "ingenieria" });
    }

    function drawCluster(cx: number, topY: number, label: string, people: Daptux[], color: string, vip: boolean) {
      const sep = 100; // escritorios separados → los letreros caben sin encimarse
      const cxs = people.length === 2 ? [cx - sep, cx + sep] : [cx];
      people.forEach((p, i) => daptuxPerson(cxs[i], topY, p, i + (vip ? 0 : 5), vip));
      c2d.fillStyle = color; c2d.font = "700 8.5px ui-sans-serif"; c2d.textAlign = "center"; c2d.fillText((vip ? "⭐ " : "") + label, cx, topY + 96);
    }

    function loop() {
      const { cols, rowH, winH, daptuxH } = layout();
      hits = [];
      c2d.clearRect(0, 0, W, H);
      drawWindow(winH);
      drawDaptux(winH, daptuxH);
      const rooms = dataRef.current.rooms;
      const cellW = W / cols;
      // 5 áreas + ATLAS al final
      const all: ({ r: Room } | { atlas: Worker })[] = [...rooms.map((r) => ({ r })), { atlas: dataRef.current.atlas }];
      all.forEach((item, i) => {
        const col = i % cols, rowi = Math.floor(i / cols);
        const rx = cellW * col, ry = winH + daptuxH + rowi * rowH;
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
        <button onClick={() => setEditing(true)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-prospect/30 bg-prospect/10 px-2.5 py-1 text-[11px] font-semibold text-prospect hover:bg-prospect/20">
          <Sparkles className="h-3.5 w-3.5" /> Personalizar (PRO)
        </button>
      </div>

      <div className="overflow-hidden rounded-xl">
        <canvas ref={ref} className="block w-full" />
      </div>

      {editing && (
        <CharacterEditor
          characters={editList}
          looks={looks}
          me={meId}
          role={role}
          onClose={() => setEditing(false)}
          onChange={(id, look) => setLooks((p) => ({ ...p, [id]: { ...p[id], ...look } }))}
        />
      )}
    </div>
  );
}
