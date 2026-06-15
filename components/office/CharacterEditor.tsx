"use client";

import { useEffect, useRef, useState } from "react";
import { drawAvatar, resolveLook, SKINS, HAIRS, SHIRTS, STYLES, ACCS, HATS, type Look } from "@/lib/avatar";
import { X } from "lucide-react";

interface Char { id: string; def: string; color: string }

export function CharacterEditor({ characters, looks, onClose, onChange }: { characters: Char[]; looks: Record<string, Look>; onClose: () => void; onChange: (id: string, look: Look) => void }) {
  const [local, setLocal] = useState<Record<string, Look>>(looks);
  const [sel, setSel] = useState(characters[0]?.id ?? "");
  const cur = characters.find((c) => c.id === sel) ?? characters[0];

  async function set(patch: Look) {
    if (!cur) return;
    const merged = { ...local[cur.id], ...patch };
    setLocal((p) => ({ ...p, [cur.id]: merged }));
    onChange(cur.id, merged); // refleja al instante en la oficina
    try { await fetch("/api/appearance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cur.id, look: merged }) }); } catch {}
  }

  if (!cur) return null;
  const L = local[cur.id] ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="panel flex max-h-[88vh] w-full max-w-[680px] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="text-[14px] font-semibold text-text">Personalizar personajes · PRO</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid flex-1 grid-cols-[150px_1fr] overflow-hidden">
          {/* lista de personajes */}
          <div className="overflow-y-auto border-r border-border p-2">
            {characters.map((c) => (
              <button key={c.id} onClick={() => setSel(c.id)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] ${sel === c.id ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface/60"}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="truncate">{local[c.id]?.name?.trim() || c.def}</span>
              </button>
            ))}
          </div>

          {/* editor del seleccionado */}
          <div className="overflow-y-auto p-4">
            <div className="mb-4 flex items-center gap-4">
              <Preview id={cur.id} look={L} color={cur.color} />
              <div className="flex-1">
                <label className="label-eyebrow">Nombre</label>
                <input value={L.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder={cur.def} className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-[13px] text-text outline-none focus:border-prospect/50" />
                <p className="mt-1 text-[10px] text-text-dim">Puesto: {cur.def}</p>
              </div>
            </div>

            <Row label="Piel"><Swatches items={SKINS} value={L.skin} onPick={(v) => set({ skin: v })} /></Row>
            <Row label="Color de pelo"><Swatches items={HAIRS} value={L.hair} onPick={(v) => set({ hair: v })} /></Row>
            <Row label="Estilo de pelo"><Options items={STYLES} value={L.style ?? resolveLook(cur.id, L).style} onPick={(v) => set({ style: v })} labels={{ short: "Corto", long: "Largo", bald: "Calvo", mohawk: "Mohawk", bun: "Moño", spiky: "Punk" }} /></Row>
            <Row label="Camisa"><Swatches items={SHIRTS} value={L.shirt} onPick={(v) => set({ shirt: v })} extra={{ label: "Auto", on: !L.shirt, onPick: () => set({ shirt: "" }) }} /></Row>
            <Row label="Accesorio"><Options items={ACCS} value={L.acc ?? resolveLook(cur.id, L).acc} onPick={(v) => set({ acc: v })} labels={{ headset: "Headset", glasses: "Gafas", none: "Ninguno" }} /></Row>
            <Row label="Gorro"><Options items={HATS} value={L.hat ?? "none"} onPick={(v) => set({ hat: v })} labels={{ none: "Ninguno", cap: "Gorra", beanie: "Gorro" }} /></Row>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="label-eyebrow mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Swatches({ items, value, onPick, extra }: { items: string[]; value?: string; onPick: (v: string) => void; extra?: { label: string; on: boolean; onPick: () => void } }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {extra && (
        <button onClick={extra.onPick} className={`h-7 rounded-md border px-2 text-[10px] font-semibold ${extra.on ? "border-prospect text-prospect" : "border-border text-text-dim"}`}>{extra.label}</button>
      )}
      {items.map((c) => (
        <button key={c} onClick={() => onPick(c)} className={`h-7 w-7 rounded-md border-2 ${value === c ? "border-prospect" : "border-transparent"}`} style={{ background: c }} title={c} />
      ))}
    </div>
  );
}

function Options({ items, value, onPick, labels }: { items: string[]; value?: string; onPick: (v: string) => void; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((o) => (
        <button key={o} onClick={() => onPick(o)} className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${value === o ? "border-prospect bg-prospect/10 text-prospect" : "border-border text-text-muted hover:text-text"}`}>{labels[o] ?? o}</button>
      ))}
    </div>
  );
}

function Preview({ id, look, color }: { id: string; look: Look; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = 84 * dpr; cv.height = 96 * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 84, 96);
    ctx.fillStyle = "#0c1322"; ctx.fillRect(0, 0, 84, 96);
    // escritorio
    ctx.fillStyle = "#6b4b2a"; ctx.fillRect(14, 74, 56, 8);
    drawAvatar(ctx, 42, 30, resolveLook(id, look), color, 1.5);
  }, [id, look, color]);
  return <canvas ref={ref} className="rounded-lg border border-border" style={{ width: 84, height: 96 }} />;
}
