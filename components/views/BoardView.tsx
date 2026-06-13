"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import type { AreaAgent, StaffMember } from "@/lib/types";
import { DeptStation } from "@/components/deck/DeptStation";
import { StaffCard } from "@/components/StaffCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { fmtMoney } from "@/lib/utils";
import { CalendarClock, CheckCircle2, TrendingUp, Megaphone, Code2, Target, Users } from "lucide-react";

export function BoardView() {
  const helm = useDeck((s) => s.areaAgents.directiva);
  const board = useDeck((s) => s.staff.filter((p) => p.department === "directiva"));
  const revenue = useDeck((s) => s.metrics.revenue);
  const dealsWon = useDeck((s) => s.metrics.dealsWon);
  const areaAgents = useDeck((s) => s.areaAgents);
  const staff = useDeck((s) => s.staff);
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const [active, setActive] = useState<StaffMember | null>(null);
  const [runAgent, setRunAgent] = useState<AreaAgent | null>(null);

  const totalAgents = Object.values(areaAgents).reduce((n, a) => n + a.length, 0);

  // KPIs ejecutivos cruzados (mezcla de datos demo)
  const kpis = [
    { label: "Pipeline comercial", value: fmtMoney(revenue), icon: Target, tint: "#22D3EE" },
    { label: "Cierres del mes", value: String(dealsWon), icon: TrendingUp, tint: "#34D399" },
    { label: "Agentes operando", value: String(totalAgents), icon: Users, tint: "#E8C766" },
    { label: "Personas activas", value: `${staff.filter((p) => p.presence !== "offline").length}`, icon: Users, tint: "#A78BFA" },
  ];

  const juntas = [
    { title: "Comité de dirección semanal", when: "Hoy 16:00", owner: "Jorge Luna (CEO)", icon: CalendarClock },
    { title: "Revisión de crecimiento — Marketing", when: "Mañana 10:00", owner: "Ana Reyes", icon: Megaphone },
    { title: "Demo de release v1.4 — Ingeniería", when: "Jue 11:30", owner: "Lucía Pérez", icon: Code2 },
  ];

  const decisions = [
    { text: "Aprobada inversión en pauta Q3 (+18% presupuesto)", by: "Directiva", tint: "#34D399" },
    { text: "Prioridad a integración de pagos antes del cierre de trimestre", by: "HELM + COO", tint: "#A78BFA" },
    { text: "Escalado a humano de 3 cuentas enterprise calientes", by: "ATLAS → Directiva", tint: "#FB7185" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs cruzados */}
      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        {kpis.map((k) => (
          <div key={k.label} className="flex min-w-[150px] flex-1 items-center gap-3 px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${k.tint}1a`, color: k.tint }}>
              <k.icon className="h-[18px] w-[18px]" />
            </div>
            <div className="leading-tight">
              <p className="stat-num text-[18px] font-medium text-text">{k.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-text-dim">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {/* HELM: orquestación ejecutiva */}
          <div>
            <p className="label-eyebrow mb-2 px-1">Orquestación ejecutiva</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {helm.map((a) => (
                <DeptStation
                  key={a.id}
                  agent={a}
                  onRun={setRunAgent}
                  enabled={agentEnabled[a.id] !== false}
                  onToggle={(ag) => toggleAgent(ag.id)}
                />
              ))}
              {/* Junta en curso */}
              <div className="panel-tight p-4">
                <p className="label-eyebrow mb-2">Próximas juntas</p>
                <div className="space-y-2">
                  {juntas.map((j) => (
                    <div key={j.title} className="flex items-start gap-2.5 rounded-lg border border-border bg-bg-soft/50 px-3 py-2">
                      <j.icon className="mt-0.5 h-4 w-4 shrink-0 text-director" />
                      <div className="leading-tight">
                        <p className="text-[12px] font-medium text-text">{j.title}</p>
                        <p className="text-[10px] text-text-dim">{j.when} · {j.owner}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Decisiones */}
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold text-text">Registro de decisiones</p>
            </div>
            <div className="divide-y divide-border/60">
              {decisions.map((d) => (
                <div key={d.text} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: d.tint }} />
                  <p className="flex-1 text-[12px] text-text-muted">{d.text}</p>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px]" style={{ color: d.tint, background: `${d.tint}14` }}>
                    {d.by}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mesa directiva (humanos) */}
        <div>
          <p className="label-eyebrow mb-2 px-1">Mesa directiva</p>
          <div className="flex flex-col gap-2">
            {board.map((p) => (
              <StaffCard key={p.id} person={p} onCheckIn={setActive} />
            ))}
          </div>
        </div>
      </div>

      <AgentTaskPanel agent={runAgent} area="Directiva" onClose={() => setRunAgent(null)} />
      <CheckInPanel person={active} onClose={() => setActive(null)} />
    </div>
  );
}
