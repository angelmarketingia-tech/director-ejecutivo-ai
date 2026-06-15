"use client";

import { useEffect, useState } from "react";
import { Sunrise, Loader2 } from "lucide-react";

const cop = (n: number) => "$" + (n || 0).toLocaleString("es-CO");

export function SummaryPanel() {
  const [range, setRange] = useState<"day" | "week" | "all">("day");
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => { load(range); /* eslint-disable-next-line */ }, [range]);
  async function load(r: string) {
    setLoading(true);
    try { const j = await (await fetch("/api/summary?range=" + r)).json(); if (j.ok) setD(j); else if (j.error?.includes("admin")) setDenied(true); } catch {}
    setLoading(false);
  }
  if (denied) return null;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sunrise className="h-4 w-4 text-scoring" />
        <p className="text-[13px] font-semibold text-text">Resumen ejecutivo</p>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-0.5">
          {(["day", "week", "all"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${range === r ? "bg-prospect/20 text-prospect" : "text-text-dim"}`}>
              {r === "day" ? "Hoy" : r === "week" ? "Semana" : "Total"}
            </button>
          ))}
        </div>
      </div>
      {loading || !d ? (
        <div className="flex items-center gap-2 py-4 text-[12px] text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Cargando KPIs…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <K label="Leads" value={d.leads.total} />
            <K label="Contactados" value={d.leads.contactados} tint="#22D3EE" />
            <K label="Ganados" value={d.leads.ganados} tint="#34D399" />
            <K label="Mensajes WhatsApp" value={d.whatsapp.total} tint="#A78BFA" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <K label="Cobrado" value={cop(d.dinero.cobrado)} tint="#34D399" />
            <K label="Por cobrar" value={cop(d.dinero.porCobrar)} tint="#FBBF24" />
            <K label="MRR" value={cop(d.dinero.mrr)} tint="#22D3EE" />
            <K label="Inversión IA (USD)" value={"$" + d.ia.costoUsd} tint="#FB7185" />
          </div>
          {d.ia.porUsuario?.length > 0 && (
            <p className="mt-2 text-[11px] text-text-dim">
              Gasto IA por persona: {d.ia.porUsuario.map((u: any) => `${u.name} $${u.usd}`).join(" · ")}
            </p>
          )}
          <p className="mt-1 text-[11px] text-text-dim">
            WhatsApp: {d.whatsapp.automaticos} automáticos · {d.whatsapp.manuales} tuyos. Retorno: {cop(d.dinero.cobrado)} cobrado vs ~${d.ia.costoUsd} USD de IA.
          </p>
        </>
      )}
    </div>
  );
}

function K({ label, value, tint }: { label: string; value: number | string; tint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <p className="stat-num text-[17px] font-medium" style={{ color: tint || "#EAF0FF" }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}
