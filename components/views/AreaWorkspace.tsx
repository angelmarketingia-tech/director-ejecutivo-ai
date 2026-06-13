"use client";

import { useDeck } from "@/lib/store";
import type { Area, StaffMember } from "@/lib/types";
import { AREA_BY_ID } from "@/lib/departments";
import { DeptStation } from "@/components/deck/DeptStation";
import { StaffCard } from "@/components/StaffCard";
import { useState } from "react";
import { CheckInPanel } from "@/components/CheckInPanel";
import { GitBranch, Sparkles, Bot, UserCheck } from "lucide-react";

/** Espacio de trabajo de un departamento: agentes autónomos + subagentes + personas reales. */
export function AreaWorkspace({ area }: { area: Exclude<Area, "hq" | "comercial" | "directiva" | "rrhh"> }) {
  const agents = useDeck((s) => s.areaAgents[area]);
  const staff = useDeck((s) => s.staff.filter((p) => p.department === area));
  const meta = AREA_BY_ID[area];
  const [active, setActive] = useState<StaffMember | null>(null);

  const subagentCount = agents.reduce((n, a) => n + a.subagents.length, 0);
  const avgQuality = Math.round(agents.reduce((n, a) => n + a.qualityScore, 0) / agents.length);
  const online = staff.filter((p) => p.presence !== "offline" && p.presence !== "away").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Métricas del área */}
      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        <Metric icon={Bot} label="Agentes" value={String(agents.length)} tint={meta.color} />
        <Metric icon={GitBranch} label="Subagentes activos" value={String(subagentCount)} tint="#E879F9" />
        <Metric icon={Sparkles} label="Calidad media" value={`${avgQuality}`} tint="#FBBF24" />
        <Metric icon={UserCheck} label="Personas activas" value={`${online}/${staff.length}`} tint="#34D399" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        {/* Agentes autónomos */}
        <div>
          <p className="label-eyebrow mb-2 px-1">
            Agentes autónomos · cada uno lleva su tarea de inicio a fin y crea subagentes para mejorar
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <DeptStation key={a.id} agent={a} />
            ))}
          </div>
        </div>

        {/* Personas reales del área */}
        <div>
          <p className="label-eyebrow mb-2 px-1">Equipo humano · {meta.label.replace(/^.*· /, "")}</p>
          <div className="flex flex-col gap-2">
            {staff.length === 0 && (
              <p className="panel-tight px-3 py-6 text-center text-[12px] text-text-dim">
                Sin personal asignado a esta área.
              </p>
            )}
            {staff.map((p) => (
              <StaffCard key={p.id} person={p} onCheckIn={setActive} />
            ))}
          </div>
        </div>
      </div>

      <CheckInPanel person={active} onClose={() => setActive(null)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="flex min-w-[130px] flex-1 items-center gap-3 px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${tint}1a`, color: tint }}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-tight">
        <p className="stat-num text-[18px] font-medium text-text">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
      </div>
    </div>
  );
}
