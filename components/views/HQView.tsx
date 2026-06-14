"use client";

import { motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { AREAS } from "@/lib/departments";
import type { Area } from "@/lib/types";
import { useNow, since } from "@/lib/useNow";
import {
  Target,
  Megaphone,
  Crown,
  Code2,
  Users,
  Bot,
  GitBranch,
  ArrowRight,
} from "lucide-react";

const ICON: Record<string, any> = {
  comercial: Target,
  marketing: Megaphone,
  directiva: Crown,
  ingenieria: Code2,
  rrhh: Users,
};

export function HQView() {
  const setArea = useDeck((s) => s.setArea);
  const areaAgents = useDeck((s) => s.areaAgents);
  const staff = useDeck((s) => s.staff);
  const now = useNow(1000);

  const areas = AREAS.filter((a) => a.id !== "hq");

  const totalAgents = Object.values(areaAgents).reduce((n, arr) => n + arr.length, 0);
  const totalSub = Object.values(areaAgents).reduce(
    (n, arr) => n + arr.reduce((m, a) => m + a.subagents.length, 0),
    0
  );
  const online = staff.filter((p) => p.presence !== "offline").length;

  const recent = [...staff].sort((a, b) => b.activitySince - a.activitySince).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Banner */}
      <div className="panel relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-radial-deck opacity-80" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-eyebrow">NEXUS · Centro de Mando Corporativo</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-text">
              Toda la compañía operando en una sala
            </h2>
            <p className="mt-1 text-[12px] text-text-muted">
              Agentes autónomos por área + equipo humano real, supervisados en tiempo real.
            </p>
          </div>
          <div className="flex gap-6">
            <Big label="Agentes IA" value={totalAgents} tint="#22D3EE" icon={Bot} />
            <Big label="Subagentes" value={totalSub} tint="#E879F9" icon={GitBranch} />
            <Big label="Personas activas" value={online} tint="#34D399" icon={Users} />
          </div>
        </div>
      </div>

      {/* Áreas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {areas.map((a) => {
            const agents = areaAgents[a.id as Exclude<Area, "hq">] ?? [];
            const sub = agents.reduce((n, ag) => n + ag.subagents.length, 0);
            const people = staff.filter((p) => p.department === a.id);
            const peopleOnline = people.filter((p) => p.presence !== "offline" && p.presence !== "away").length;
            const Icon = ICON[a.id] ?? Target;
            return (
              <motion.button
                key={a.id}
                whileHover={{ y: -3 }}
                onClick={() => setArea(a.id as Area)}
                className="panel group relative overflow-hidden p-4 text-left"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl"
                  style={{ background: `${a.color}22` }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{ background: `${a.color}1a`, color: a.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-[14px] font-semibold text-text">
                        {a.label.replace(/^.*· /, "")}
                      </p>
                      <p className="text-[11px] text-text-dim">{a.tagline}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-dim transition-colors group-hover:text-text" />
                </div>

                <div className="relative mt-4 flex items-center gap-4 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5" style={{ color: a.color }} />
                    {agents.length} agentes
                  </span>
                  {sub > 0 && (
                    <span className="flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-[#E879F9]" />
                      {sub} subagentes
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ok" />
                    {peopleOnline}/{people.length}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Pulso de actividad humana reciente */}
        <div className="panel flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold text-text">Actividad reciente del equipo</p>
          </div>
          <div className="flex flex-col gap-1 p-2">
            {recent.length === 0 && (
              <p className="px-3 py-6 text-center text-[11px] text-text-dim">
                Aún sin actividad. Da de alta a tu equipo en Recursos Humanos.
              </p>
            )}
            {recent.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
                  style={{ background: `${p.color}1f`, color: p.color }}
                >
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[12px] text-text">
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-text-muted">· {p.activity}</span>
                  </p>
                  <p className="stat-num text-[10px] text-text-dim">{since(p.activitySince, now)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, tint, icon: Icon }: { label: string; value: number; tint: string; icon: any }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${tint}1a`, color: tint }}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="stat-num text-[20px] font-medium" style={{ color: tint }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}
