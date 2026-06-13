"use client";

import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";
import { AGENT_STATUS_LABEL } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Search, Microscope, SlidersHorizontal, PenLine, PhoneCall } from "lucide-react";

const ICON = {
  prospect: Search,
  research: Microscope,
  scoring: SlidersHorizontal,
  email: PenLine,
  voice: PhoneCall,
} as const;

export function AgentStation({ agent }: { agent: Agent }) {
  if (agent.id === "director") return null;
  const Icon = ICON[agent.id as keyof typeof ICON] ?? Search;
  const live = agent.status !== "idle" && agent.status !== "blocked";

  return (
    <motion.div
      layout
      className="panel-tight relative overflow-hidden p-4"
      style={{ boxShadow: live ? `inset 0 0 0 1px ${agent.color}22` : undefined }}
    >
      {/* halo de color */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${agent.color}1f` }}
      />
      {live && <div className="scanline pointer-events-none absolute inset-0 opacity-60" />}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="relative grid h-11 w-11 place-items-center rounded-xl"
            style={{ background: `${agent.color}1a`, color: agent.color }}
          >
            <Icon className="h-5 w-5" />
            {live && (
              <span
                className="absolute inset-0 animate-pulse-ring rounded-xl"
                style={{ boxShadow: `0 0 0 1px ${agent.color}55` }}
              />
            )}
          </div>
          <div className="leading-tight">
            <p className="font-mono text-[14px] font-semibold tracking-tight text-text">
              {agent.name}
            </p>
            <p className="text-[11px] text-text-muted">{agent.role}</p>
          </div>
        </div>

        <span
          className="chip shrink-0"
          style={{
            color: agent.color,
            borderColor: `${agent.color}40`,
            background: `${agent.color}12`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: agent.color }}
          />
          {AGENT_STATUS_LABEL[agent.status]}
        </span>
      </div>

      {/* tarea en curso */}
      <p className="relative mt-3 line-clamp-1 font-mono text-[11px] text-text-muted">
        <span className="text-text-dim">›</span> {agent.currentTask ?? "—"}
      </p>

      {/* barra de progreso */}
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
        <motion.div
          className="h-full rounded-full"
          style={{ background: agent.color }}
          animate={{ width: `${agent.progress}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>

      <div className="relative mt-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-text-dim">
        <span>
          Cola{" "}
          <span className="stat-num text-text-muted">{agent.queue}</span>
        </span>
        <span>
          Producción{" "}
          <span className="stat-num" style={{ color: agent.color }}>
            {agent.throughput}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
