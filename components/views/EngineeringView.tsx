"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import type { AreaAgent, StaffMember } from "@/lib/types";
import { DeptStation } from "@/components/deck/DeptStation";
import { StaffCard } from "@/components/StaffCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { IS_DEMO } from "@/lib/demoFlag";
import { Code2, GitBranch, Sparkles, Users, GitPullRequest, Rocket } from "lucide-react";

const SPRINT = [
  { col: "Backlog", tint: "#8A97B8", items: ["Rate limiting API", "Migrar a Prisma 6", "Webhooks de Stripe"] },
  { col: "En curso", tint: "#22D3EE", items: ["Endpoint de pagos (BYTE)", "Refactor auth (NOVA)"] },
  { col: "Revisión", tint: "#FBBF24", items: ["PR #482 checkout (LINT)"] },
  { col: "Hecho", tint: "#34D399", items: ["Login OAuth", "Dashboard v1", "Seed de datos"] },
];

const PRS = [
  { id: "#482", title: "feat: endpoint de pagos", author: "Diego Salas", state: "En revisión", tint: "#FBBF24" },
  { id: "#479", title: "fix: validación de carrito", author: "Sofía Mena", state: "Aprobado", tint: "#34D399" },
  { id: "#475", title: "refactor: capa de auth", author: "Lucía Pérez", state: "Cambios pedidos", tint: "#FB7185" },
];

const RELEASES = [
  { v: "v1.4", when: "Jue", status: "En preparación (SHIP)", tint: "#FBBF24" },
  { v: "v1.3", when: "Hace 6d", status: "Desplegada", tint: "#34D399" },
];

export function EngineeringView() {
  const agents = useDeck((s) => s.areaAgents.ingenieria);
  const staff = useDeck((s) => s.staff.filter((p) => p.department === "ingenieria"));
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const [runAgent, setRunAgent] = useState<AreaAgent | null>(null);
  const [checkin, setCheckin] = useState<StaffMember | null>(null);

  const subCount = agents.reduce((n, a) => n + a.subagents.length, 0);
  const avgQ = Math.round(agents.reduce((n, a) => n + a.qualityScore, 0) / agents.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        <Metric icon={Code2} label="Agentes" value={String(agents.length)} tint="#818CF8" />
        <Metric icon={GitBranch} label="Subagentes" value={String(subCount)} tint="#E879F9" />
        <Metric icon={Sparkles} label="Calidad media" value={String(avgQ)} tint="#FBBF24" />
        <Metric icon={Users} label="Equipo" value={String(staff.length)} tint="#34D399" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="label-eyebrow mb-2 px-1">Agentes autónomos · pulsa “Ejecutar” para correr una tarea con subagentes</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {agents.map((a) => (
                <DeptStation
                  key={a.id}
                  agent={a}
                  onRun={setRunAgent}
                  enabled={agentEnabled[a.id] !== false}
                  onToggle={(ag) => toggleAgent(ag.id)}
                />
              ))}
            </div>
          </div>

          {/* Sprint board */}
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold text-text">Sprint actual</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
              {(IS_DEMO ? SPRINT : SPRINT.map((c) => ({ ...c, items: [] as string[] }))).map((c) => (
                <div key={c.col} className="rounded-xl border border-border bg-bg-soft/50">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.tint }} />
                    <span className="text-[11px] font-semibold text-text">{c.col}</span>
                    <span className="stat-num ml-auto text-[10px] text-text-dim">{c.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-2 pb-2">
                    {c.items.map((it) => (
                      <div key={it} className="rounded-lg border border-border bg-surface/70 px-2.5 py-2 text-[11px] text-text-muted">
                        {it}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRs */}
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <GitPullRequest className="h-4 w-4 text-[#818CF8]" />
              <p className="text-[13px] font-semibold text-text">Pull requests</p>
            </div>
            <div className="divide-y divide-border/60">
              {!IS_DEMO && <p className="px-4 py-5 text-center text-[12px] text-text-dim">Sin PRs aún</p>}
              {(IS_DEMO ? PRS : []).map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="stat-num text-[11px] text-text-dim">{pr.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-text">{pr.title}</p>
                    <p className="text-[10px] text-text-dim">{pr.author}</p>
                  </div>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ color: pr.tint, background: `${pr.tint}14` }}>
                    {pr.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="label-eyebrow mb-2 px-1">Equipo de Desarrollo</p>
            <div className="flex flex-col gap-2">
              {staff.map((p) => (
                <StaffCard key={p.id} person={p} onCheckIn={setCheckin} />
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[#34D399]" />
              <p className="text-[13px] font-semibold text-text">Releases</p>
            </div>
            <div className="space-y-2">
              {!IS_DEMO && <p className="py-3 text-center text-[12px] text-text-dim">Sin releases aún</p>}
              {(IS_DEMO ? RELEASES : []).map((r) => (
                <div key={r.v} className="flex items-center justify-between rounded-lg border border-border bg-bg-soft/50 px-3 py-2">
                  <span className="stat-num text-[12px] font-medium text-text">{r.v}</span>
                  <span className="text-[10px]" style={{ color: r.tint }}>{r.status}</span>
                  <span className="text-[10px] text-text-dim">{r.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AgentTaskPanel agent={runAgent} area="Desarrollo" onClose={() => setRunAgent(null)} />
      <CheckInPanel person={checkin} onClose={() => setCheckin(null)} />
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
