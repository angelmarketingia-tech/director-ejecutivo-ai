"use client";

import { motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { fmtNum } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export function DirectorCore() {
  const director = useDeck((s) => s.agents[0]);
  const m = useDeck((s) => s.metrics);
  const activeAgents = useDeck((s) =>
    s.agents.filter((a) => a.id !== "director" && a.status !== "idle").length
  );

  return (
    <div className="panel relative overflow-hidden p-5 shadow-panel">
      {/* fondo radial */}
      <div className="pointer-events-none absolute inset-0 bg-radial-deck opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[size:34px_34px] opacity-[0.35]" />

      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Reactor / avatar del Director */}
        <div className="relative grid h-[132px] w-[132px] shrink-0 place-items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border border-director/30"
              style={{ inset: i * 14 }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 18 + i * 8, repeat: Infinity, ease: "linear" }}
            />
          ))}
          <motion.div
            className="relative grid h-[78px] w-[78px] place-items-center rounded-full bg-gradient-to-br from-director/90 to-director/40 text-bg shadow-[0_0_40px_-4px_rgba(232,199,102,0.6)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="font-mono text-[20px] font-semibold tracking-tight">
              ATLAS
            </span>
          </motion.div>
          <span className="absolute -bottom-1 flex items-center gap-1 rounded-full border border-director/40 bg-bg/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-director backdrop-blur">
            <ShieldCheck className="h-2.5 w-2.5" /> Orquestador
          </span>
        </div>

        {/* Estado / directiva en curso */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="label-eyebrow">Director Comercial AI</p>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-text">
            Coordinando la operación comercial
          </h2>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-director/25 bg-director/10 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-director opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-director" />
            </span>
            <span className="font-mono text-[12px] text-director">
              {director.currentTask}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
            <Stat label="Estaciones activas" value={`${activeAgents}/5`} />
            <Stat label="Conversión" value={`${m.conversionRate}%`} />
            <Stat label="Calientes" value={fmtNum(m.hotLeads)} tint="#FB7185" />
            <Stat label="Reuniones" value={fmtNum(m.meetingsBooked)} tint="#A78BFA" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tint = "#EAF0FF",
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div className="leading-tight">
      <p className="stat-num text-[17px] font-medium" style={{ color: tint }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-text-dim">{label}</p>
    </div>
  );
}
