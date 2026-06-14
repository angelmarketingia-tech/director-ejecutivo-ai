"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import { MetricsBar } from "@/components/deck/MetricsBar";
import { DirectorCore } from "@/components/deck/DirectorCore";
import { AgentStation } from "@/components/deck/AgentStation";
import { ActivityConsole } from "@/components/deck/ActivityConsole";
import { HotLeads } from "@/components/deck/HotLeads";
import { PipelineBoard } from "@/components/deck/PipelineBoard";
import { UserPlus, Zap, Globe, Loader2, Search } from "lucide-react";

function WebProspect() {
  const addDiscoveredLeads = useDeck((s) => s.addDiscoveredLeads);
  const [niche, setNiche] = useState("restaurantes");
  const [city, setCity] = useState("Quito");
  const [source, setSource] = useState<"web" | "places" | "apify">("web");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setMsg(null);
    const endpoint =
      source === "apify" ? "/api/leads/apify" : source === "places" ? "/api/leads/places" : "/api/leads/discover";
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city, count: 8 }),
      });
      const j = await r.json();
      if (j.ok) {
        const added = addDiscoveredLeads(j.leads || []);
        setMsg(
          added > 0
            ? `✅ ${added} negocios REALES añadidos${source === "apify" ? " (con teléfono/web)" : " (con fuente verificable)"}. Ábrelos en Leads.`
            : "No se hallaron negocios reales. Prueba otro nicho/ciudad."
        );
      } else if (j.noKey) {
        setMsg(
          source === "places"
            ? "⚠️ Falta GOOGLE_MAPS_API_KEY (y NEXT_PUBLIC_DEMO_MODE=false). No invento datos."
            : "⚠️ Falta ANTHROPIC_API_KEY: no busco datos reales ni invento nada."
        );
      } else if (j.noToken) {
        setMsg("⚠️ Falta APIFY_TOKEN en Vercel para usar Apify.");
      } else if (j.budgetExceeded) {
        setMsg("⛔ Tope de gasto diario alcanzado. Súbelo en Configuración.");
      } else {
        setMsg(`Error: ${j.error ?? "desconocido"}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${String(e?.message ?? e)}`);
    }
    setLoading(false);
  }

  return (
    <div className="panel p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-prospect" />
        <p className="text-[12px] font-semibold text-text">Buscar leads REALES</p>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-0.5">
          <button
            data-testid="src-web"
            onClick={() => setSource("web")}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${source === "web" ? "bg-prospect/20 text-prospect" : "text-text-dim"}`}
          >
            Web (Claude)
          </button>
          <button
            data-testid="src-places"
            onClick={() => setSource("places")}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${source === "places" ? "bg-prospect/20 text-prospect" : "text-text-dim"}`}
          >
            Google Places (tel)
          </button>
          <button
            data-testid="src-apify"
            onClick={() => setSource("apify")}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${source === "apify" ? "bg-prospect/20 text-prospect" : "text-text-dim"}`}
          >
            Apify (tel/email)
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          data-testid="web-niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Nicho (ej. restaurantes)"
          className="min-w-[160px] flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50"
        />
        <input
          data-testid="web-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ciudad (ej. Quito)"
          className="min-w-[140px] flex-1 rounded-lg border border-border bg-bg-soft px-3 py-2 text-[12px] text-text outline-none focus:border-prospect/50"
        />
        <button
          data-testid="btn-web-search"
          onClick={search}
          disabled={loading || !niche.trim() || !city.trim()}
          className="flex items-center gap-2 rounded-lg border border-prospect/30 bg-prospect/10 px-3 py-2 text-[12px] font-semibold text-prospect transition-colors hover:bg-prospect/20 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {loading ? "Buscando en la web…" : "Buscar reales"}
        </button>
      </div>
      {msg && <p data-testid="web-result" className="mt-2 text-[11px] text-text-muted">{msg}</p>}
    </div>
  );
}

function ControlBar() {
  const addLead = useDeck((s) => s.addLead);
  const closeAllOpen = useDeck((s) => s.closeAllOpen);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="panel flex flex-wrap items-center gap-2 p-3">
      <button
        data-testid="btn-generar-lead"
        onClick={() => {
          addLead();
          setResult("Lead (demo) generado y prospectado");
        }}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
      >
        <UserPlus className="h-3.5 w-3.5" /> Generar lead demo
      </button>
      <button
        data-testid="btn-cerrar-pipeline"
        onClick={() => {
          const r = closeAllOpen();
          setResult(`Pipeline ejecutado: ${r.won} ganados · ${r.lost} perdidos`);
        }}
        className="flex items-center gap-2 rounded-lg border border-director/30 bg-director/10 px-3 py-2 text-[12px] font-semibold text-director transition-colors hover:bg-director/20"
      >
        <Zap className="h-3.5 w-3.5" /> Ejecutar pipeline de todos
      </button>
      {result && (
        <span data-testid="control-result" className="text-[11px] text-text-muted">
          {result}
        </span>
      )}
    </div>
  );
}

export function DeckView() {
  const agents = useDeck((s) => s.agents);
  const stations = agents.filter((a) => a.id !== "director");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      {/* Columna principal: la "sala" */}
      <div className="flex flex-col gap-4">
        <ControlBar />
        <MetricsBar />
        <DirectorCore />

        <div>
          <p className="label-eyebrow mb-2 px-1">Estaciones de trabajo · 5 agentes autónomos</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {stations.map((a) => (
              <AgentStation key={a.id} agent={a} />
            ))}
          </div>
        </div>

        <PipelineBoard compact />
      </div>

      {/* Rail derecho */}
      <div className="flex flex-col gap-4">
        <HotLeads />
        <div className="min-h-[420px] flex-1">
          <ActivityConsole />
        </div>
      </div>
    </div>
  );
}
