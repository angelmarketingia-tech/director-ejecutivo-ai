"use client";

import { useState } from "react";
import { useDeck } from "@/lib/store";
import type { AreaAgent, StaffMember } from "@/lib/types";
import { DeptStation } from "@/components/deck/DeptStation";
import { StaffCard } from "@/components/StaffCard";
import { CheckInPanel } from "@/components/CheckInPanel";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { IS_DEMO } from "@/lib/demoFlag";
import { Megaphone, GitBranch, Sparkles, Users, Briefcase, Building2 } from "lucide-react";

const SERVICES = [
  { name: "Branding & identidad", tint: "#E879F9" },
  { name: "Contenido & social", tint: "#22D3EE" },
  { name: "Pauta / Performance Ads", tint: "#FB7185" },
  { name: "SEO & web", tint: "#FBBF24" },
  { name: "Email marketing", tint: "#34D399" },
  { name: "Estrategia de marca", tint: "#A78BFA" },
];

const CAMPAIGNS = [
  { name: "Lanzamiento Q3", channel: "Meta Ads", status: "Activa", budget: "$4.2K", metric: "CTR 3.1%", tint: "#34D399" },
  { name: "Remarketing carrito", channel: "Google Ads", status: "Activa", budget: "$2.8K", metric: "CPA $14", tint: "#34D399" },
  { name: "Newsletter mensual", channel: "Email", status: "Programada", budget: "—", metric: "OR 41%", tint: "#FBBF24" },
  { name: "Colab influencers", channel: "Instagram", status: "Borrador", budget: "$1.5K", metric: "—", tint: "#8A97B8" },
];

const CALENDAR = [
  { day: "Lun", items: ["Reel producto", "Story BTS"] },
  { day: "Mar", items: ["Carrusel tips"] },
  { day: "Mié", items: ["Blog SEO", "Email"] },
  { day: "Jue", items: ["Testimonio"] },
  { day: "Vie", items: ["Promo fin de semana", "Reel"] },
  { day: "Sáb", items: [] },
  { day: "Dom", items: ["Recap semanal"] },
];

const STATUS_TINT: Record<string, string> = { Activa: "#34D399", Programada: "#FBBF24", Borrador: "#8A97B8" };

export function MarketingView() {
  const agents = useDeck((s) => s.areaAgents.marketing);
  const staff = useDeck((s) => s.staff.filter((p) => p.department === "marketing"));
  const agentEnabled = useDeck((s) => s.agentEnabled);
  const toggleAgent = useDeck((s) => s.toggleAgent);
  const accounts = useDeck((s) => s.leads.filter((l) => l.stage === "won"));
  const [runAgent, setRunAgent] = useState<AreaAgent | null>(null);
  const [checkin, setCheckin] = useState<StaffMember | null>(null);

  const subCount = agents.reduce((n, a) => n + a.subagents.length, 0);
  const avgQ = Math.round(agents.reduce((n, a) => n + a.qualityScore, 0) / agents.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-wrap items-stretch divide-x divide-border overflow-hidden">
        <Metric icon={Megaphone} label="Agentes" value={String(agents.length)} tint="#E879F9" />
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

          {/* Tablero de campañas */}
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold text-text">Campañas</p>
            </div>
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wide text-text-dim">
                  <th className="px-4 py-2 font-medium">Campaña</th>
                  <th className="px-4 py-2 font-medium">Canal</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Presupuesto</th>
                  <th className="px-4 py-2 text-right font-medium">Métrica</th>
                </tr>
              </thead>
              <tbody>
                {!IS_DEMO && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-text-dim">Sin campañas aún · crea una en Configuración</td></tr>
                )}
                {(IS_DEMO ? CAMPAIGNS : []).map((c) => (
                  <tr key={c.name} className="border-b border-border/60 hover:bg-surface/60">
                    <td className="px-4 py-2.5 font-medium text-text">{c.name}</td>
                    <td className="px-4 py-2.5 text-text-muted">{c.channel}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ color: STATUS_TINT[c.status], background: `${STATUS_TINT[c.status]}14` }}>
                        {c.status}
                      </span>
                    </td>
                    <td className="stat-num px-4 py-2.5 text-text-muted">{c.budget}</td>
                    <td className="stat-num px-4 py-2.5 text-right text-email">{c.metric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calendario de contenidos */}
          <div className="panel overflow-x-auto p-4">
            <p className="label-eyebrow mb-3">Calendario de contenidos · esta semana</p>
            <div className="grid grid-cols-7 gap-2 min-w-[520px] sm:min-w-0">
              {(IS_DEMO ? CALENDAR : CALENDAR.map((d) => ({ ...d, items: [] as string[] }))).map((d) => (
                <div key={d.day} className="rounded-lg border border-border bg-bg-soft/50 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase text-text-dim">{d.day}</p>
                  <div className="space-y-1">
                    {d.items.map((it) => (
                      <p key={it} className="rounded bg-[#E879F9]/12 px-1.5 py-1 text-[9.5px] leading-tight text-[#E879F9]">
                        {it}
                      </p>
                    ))}
                    {d.items.length === 0 && <p className="text-[9px] text-text-dim">—</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Servicios de la agencia */}
          <div className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#E879F9]" />
              <p className="text-[13px] font-semibold text-text">Servicios de la agencia</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <span
                  key={s.name}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
                  style={{ color: s.tint, borderColor: `${s.tint}40`, background: `${s.tint}10` }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="label-eyebrow mb-2 px-1">Equipo de Marketing</p>
            <div className="flex flex-col gap-2">
              {staff.map((p) => (
                <StaffCard key={p.id} person={p} onCheckIn={setCheckin} />
              ))}
            </div>
          </div>

          {/* Cuentas: clientes ganados por el área comercial */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#34D399]" />
                <p className="text-[13px] font-semibold text-text">Cuentas activas</p>
              </div>
              <span data-testid="marketing-accounts" className="stat-num rounded-full bg-email/15 px-2 py-0.5 text-[11px] text-email">
                {accounts.length}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-2">
              {accounts.length === 0 && (
                <p className="px-3 py-5 text-center text-[11px] text-text-dim">
                  Aún sin clientes. Cierra leads en Comercial y aparecerán aquí como cuentas de la agencia.
                </p>
              )}
              {accounts.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface/60">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-email/15 text-[10px] font-semibold text-email">
                    {a.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12px] font-medium text-text">{a.company}</p>
                    <p className="truncate text-[10px] text-text-dim">{a.category} · {a.city}</p>
                  </div>
                  <span className="chip border-email/30 bg-email/10 text-email">cliente</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AgentTaskPanel agent={runAgent} area="Marketing" onClose={() => setRunAgent(null)} />
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
