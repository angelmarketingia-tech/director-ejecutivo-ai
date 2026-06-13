"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import type { Area, StaffMember } from "@/lib/types";
import { AREA_BY_ID, PRESENCE_COLOR, PRESENCE_LABEL } from "@/lib/departments";
import { StaffCard } from "@/components/StaffCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { DeptStation } from "@/components/deck/DeptStation";
import { cn } from "@/lib/utils";
import type { AreaAgent, Presence } from "@/lib/types";

const DEPTS: Array<{ id: Exclude<Area, "hq"> | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "comercial", label: "Comercial" },
  { id: "marketing", label: "Marketing" },
  { id: "ingenieria", label: "Desarrollo" },
  { id: "directiva", label: "Directiva" },
  { id: "rrhh", label: "RR.HH." },
];

export function HRView() {
  const staff = useDeck((s) => s.staff);
  const care = useDeck((s) => s.areaAgents.rrhh);
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const [filter, setFilter] = useState<Exclude<Area, "hq"> | "all">("all");
  const [active, setActive] = useState<StaffMember | null>(null);
  const [runAgent, setRunAgent] = useState<AreaAgent | null>(null);

  const rows = staff.filter((p) => (filter === "all" ? true : p.department === filter));

  const byPresence = (pr: Presence) => staff.filter((p) => p.presence === pr).length;
  const presences: Presence[] = ["online", "busy", "meeting", "away", "offline"];

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen de presencia */}
      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        {presences.map((pr) => (
          <div key={pr} className="flex min-w-[120px] flex-1 items-center gap-3 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRESENCE_COLOR[pr] }} />
            <div className="leading-tight">
              <p className="stat-num text-[18px] font-medium text-text">{byPresence(pr)}</p>
              <p className="text-[10px] uppercase tracking-wide text-text-dim">{PRESENCE_LABEL[pr]}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* Roster de personas reales */}
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <p className="text-[13px] font-semibold text-text">Personas reales · presencia y actividad</p>
              <p className="text-[11px] text-text-dim">
                Cada quien marca qué hace; la sala muestra nombre, actividad y hace cuánto.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {DEPTS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setFilter(d.id as any)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    filter === d.id ? "bg-surface-2 text-text" : "text-text-muted hover:text-text"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
            {rows.map((p) => (
              <div key={p.id} className="relative">
                <span
                  className="absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide"
                  style={{ color: AREA_BY_ID[p.department].color, background: `${AREA_BY_ID[p.department].color}1a` }}
                >
                  {AREA_BY_ID[p.department].label.replace(/^.*· /, "")}
                </span>
                <StaffCard person={p} onCheckIn={setActive} />
              </div>
            ))}
          </div>
        </div>

        {/* CARE: agente de bienestar */}
        <div>
          <p className="label-eyebrow mb-2 px-1">Supervisión de equipo</p>
          <div className="flex flex-col gap-3">
            {care.map((a) => (
              <DeptStation
                key={a.id}
                agent={a}
                onRun={setRunAgent}
                enabled={agentEnabled[a.id] !== false}
                onToggle={(ag) => toggleAgent(ag.id)}
              />
            ))}
            <div className="panel-tight p-4 text-[12px] text-text-muted">
              <p className="label-eyebrow mb-2">Cómo funciona</p>
              El agente <span className="text-ok">CARE</span> supervisa carga y bienestar.
              Las personas marcan su actividad con <span className="text-text">“Marcar”</span>;
              cada check-in sella la hora y actualiza el “hace cuánto” en vivo.
            </div>
          </div>
        </div>
      </div>

      <AgentTaskPanel agent={runAgent} area="Recursos Humanos" onClose={() => setRunAgent(null)} />
      <CheckInPanel person={active} onClose={() => setActive(null)} />
    </div>
  );
}
