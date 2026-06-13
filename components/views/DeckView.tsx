"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import { MetricsBar } from "@/components/deck/MetricsBar";
import { DirectorCore } from "@/components/deck/DirectorCore";
import { AgentStation } from "@/components/deck/AgentStation";
import { ActivityConsole } from "@/components/deck/ActivityConsole";
import { HotLeads } from "@/components/deck/HotLeads";
import { PipelineBoard } from "@/components/deck/PipelineBoard";
import { UserPlus, Zap } from "lucide-react";

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
          setResult("Lead generado y prospectado");
        }}
        className="flex items-center gap-2 rounded-lg border border-prospect/30 bg-prospect/10 px-3 py-2 text-[12px] font-semibold text-prospect transition-colors hover:bg-prospect/20"
      >
        <UserPlus className="h-3.5 w-3.5" /> Generar lead
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
