"use client";

import { useDeck } from "@/lib/store";
import { AREA_BY_ID } from "@/lib/departments";
import type { Area } from "@/lib/types";
import { Cpu } from "lucide-react";

/**
 * Oficina virtual top-down e interactiva. Cada área es una sala con escritorios y
 * avatares (agentes + equipo) que "trabajan". ATLAS (orquestador) en la oficina central,
 * más grande. Click en una sala → entra a esa área.
 */
type Person = { key: string; label: string; color: string; working: boolean; tip: string };

export function OfficeMap() {
  const setArea = useDeck((s) => s.setArea);
  const agents = useDeck((s) => s.agents);
  const areaAgents = useDeck((s) => s.areaAgents);
  const staff = useDeck((s) => s.staff);
  const agentEnabled = useDeck((s) => s.agentEnabled);

  const director = agents.find((a) => a.id === "director");

  const commercial: Person[] = agents
    .filter((a) => a.id !== "director")
    .map((a) => ({ key: a.id, label: a.name, color: a.color, working: agentEnabled[a.id] !== false && a.status !== "idle", tip: `${a.name} · ${a.currentTask ?? a.role}` }));

  function deptPeople(area: Exclude<Area, "hq">): Person[] {
    const ags = (areaAgents[area] ?? []).map((a) => ({ key: a.id, label: a.name, color: a.color, working: agentEnabled[a.id] !== false && a.mode !== "idle", tip: `${a.name} · ${a.task ?? a.role}` }));
    const ppl = staff.filter((p) => p.department === area).map((p) => ({ key: p.id, label: p.initials, color: p.color, working: p.presence !== "offline", tip: `${p.name} · ${p.activity || p.role}` }));
    return [...ags, ...ppl];
  }

  const rooms: { id: Area; people: Person[] }[] = [
    { id: "comercial", people: commercial },
    { id: "marketing", people: deptPeople("marketing") },
    { id: "directiva", people: deptPeople("directiva") },
    { id: "ingenieria", people: deptPeople("ingenieria") },
    { id: "rrhh", people: deptPeople("rrhh") },
  ];

  return (
    <div className="panel overflow-hidden p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        <p className="text-[13px] font-semibold text-text">Oficina virtual · toda la compañía en una sala</p>
        <span className="ml-auto text-[10px] text-text-dim">toca un área para entrar</span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[760px] gap-3"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "230px 230px",
            gridTemplateAreas: `"comercial atlas atlas marketing" "ingenieria directiva rrhh rrhh"`,
          }}
        >
          {/* ATLAS — oficina central, más grande */}
          <button
            onClick={() => setArea("hq")}
            style={{ gridArea: "atlas" }}
            className="group relative overflow-hidden rounded-2xl border border-director/30 text-left transition-all hover:border-director/60"
          >
            <Floor tint="#E8C766" big />
            <div className="relative flex h-full flex-col items-center justify-center p-4">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-director/20 ring-1 ring-director/50">
                <span className="absolute inset-0 animate-pulse-ring rounded-2xl" style={{ boxShadow: "0 0 0 1px rgba(232,199,102,0.5)" }} />
                <Cpu className="h-7 w-7 text-director" />
              </div>
              <p className="mt-3 text-[14px] font-semibold tracking-tight text-text">{director?.name ?? "ATLAS"}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-director">Orquestador · Centro de Mando</p>
              <p className="mt-1 line-clamp-1 max-w-[90%] text-center font-mono text-[10px] text-text-muted">› {director?.currentTask ?? "Coordinando la compañía"}</p>
              {/* mesa central */}
              <div className="mt-3 flex gap-2">
                {[0, 1, 2].map((i) => <Desk key={i} color="#E8C766" />)}
              </div>
            </div>
          </button>

          {/* Salas por área */}
          {rooms.map((r) => {
            const meta = AREA_BY_ID[r.id];
            return (
              <button
                key={r.id}
                data-testid={`office-${r.id}`}
                onClick={() => setArea(r.id)}
                style={{ gridArea: r.id }}
                className="group relative overflow-hidden rounded-2xl border border-border text-left transition-all hover:border-border-strong hover:shadow-glow-soft"
              >
                <Floor tint={meta.color} />
                <div className="relative flex h-full flex-col p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                    <span className="text-[12px] font-semibold text-text">{meta.label.replace(/^.*· /, "")}</span>
                    <span className="ml-auto rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] text-text-dim">
                      {r.people.filter((p) => p.working).length}/{r.people.length} activos
                    </span>
                  </div>

                  {/* Escritorios */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.people.slice(0, 6).map((p) => (
                      <Workstation key={p.key} p={p} />
                    ))}
                    {r.people.length === 0 && <span className="text-[10px] text-text-dim">Sala lista</span>}
                  </div>

                  {/* Detalles de oficina */}
                  <div className="mt-auto flex items-end justify-between pt-2">
                    <span className="text-[16px] leading-none opacity-70">🪴</span>
                    <span className="text-[14px] leading-none opacity-60">🪟</span>
                    <span className="text-[16px] leading-none opacity-70">☕</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Floor({ tint, big }: { tint: string; big?: boolean }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tint}14, transparent 60%), #0c1322` }} />
      {/* baldosas */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: big ? "40px 40px" : "32px 32px",
        }}
      />
    </>
  );
}

/** Escritorio con monitor encendido + avatar de la persona. */
function Workstation({ p }: { p: Person }) {
  return (
    <div className="flex flex-col items-center gap-1" title={p.tip}>
      <div
        className="animate-float"
        style={{ animationDelay: `${(p.key.charCodeAt(0) % 10) * 0.25}s` }}
      >
        <div className="relative grid h-7 w-7 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: p.color }}>
          {p.label.slice(0, 2).toUpperCase()}
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0c1322]"
            style={{ background: p.working ? "#34D399" : "#5A678C" }}
          />
        </div>
      </div>
      {/* mini escritorio */}
      <div className="h-1.5 w-9 rounded-sm bg-[#1a2236]" style={{ boxShadow: p.working ? `0 -3px 6px -2px ${p.color}` : "none" }}>
        <div className="mx-auto h-1 w-3 rounded-[1px]" style={{ background: p.working ? p.color : "#33405e" }} />
      </div>
    </div>
  );
}

function Desk({ color }: { color: string }) {
  return (
    <div className="h-2 w-12 rounded-sm bg-[#1a2236]">
      <div className="mx-auto h-1.5 w-4 rounded-[1px]" style={{ background: color }} />
    </div>
  );
}
