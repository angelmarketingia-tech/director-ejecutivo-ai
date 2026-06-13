"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AgentMode, AreaAgent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GitBranch, Sparkles, CheckCircle2, Cpu, Play, Power } from "lucide-react";

const MODE: Record<AgentMode, { label: string; tint: string }> = {
  planning: { label: "Planificando", tint: "#8A97B8" },
  working: { label: "Ejecutando", tint: "#22D3EE" },
  spawning: { label: "Creando subagentes", tint: "#E879F9" },
  synthesizing: { label: "Sintetizando", tint: "#A78BFA" },
  reviewing: { label: "Verificando calidad", tint: "#FBBF24" },
  done: { label: "Completado", tint: "#34D399" },
  idle: { label: "En espera", tint: "#5A678C" },
  blocked: { label: "Bloqueado", tint: "#FB7185" },
};

export function DeptStation({
  agent,
  onRun,
  enabled = true,
  onToggle,
}: {
  agent: AreaAgent;
  onRun?: (a: AreaAgent) => void;
  enabled?: boolean;
  onToggle?: (a: AreaAgent) => void;
}) {
  const mode = enabled ? MODE[agent.mode] : { label: "Desactivado", tint: "#5A678C" };
  const live = enabled && agent.mode !== "idle" && agent.mode !== "blocked";

  return (
    <motion.div
      layout
      className={cn(
        "panel-tight group relative overflow-hidden p-4 transition-opacity",
        !enabled && "opacity-55"
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${agent.color}1f` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="relative grid h-11 w-11 place-items-center rounded-xl font-mono text-[11px] font-semibold"
            style={{ background: `${agent.color}1a`, color: agent.color }}
          >
            {agent.name.slice(0, 2)}
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

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="chip"
            style={{ color: mode.tint, borderColor: `${mode.tint}40`, background: `${mode.tint}12` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: mode.tint }} />
            {mode.label}
          </span>
          {onToggle && (
            <button
              data-testid="btn-agent-toggle"
              onClick={() => onToggle(agent)}
              title={enabled ? "Desactivar agente (ahorra API)" : "Activar agente"}
              className="grid h-7 w-7 place-items-center rounded-md border transition-colors"
              style={{
                color: enabled ? agent.color : "#5A678C",
                borderColor: enabled ? `${agent.color}40` : "rgba(148,163,184,0.18)",
                background: enabled ? `${agent.color}10` : "transparent",
              }}
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tarea de inicio a fin */}
      <div className="relative mt-3">
        <p className="line-clamp-1 font-mono text-[11px] text-text-muted">
          <span className="text-text-dim">tarea</span> · {agent.task ?? "—"}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-text-dim">
          → meta: {agent.goal ?? "—"}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <motion.div
            className="h-full rounded-full"
            style={{ background: agent.color }}
            animate={{ width: `${agent.taskProgress}%` }}
            transition={{ ease: "easeOut", duration: 0.5 }}
          />
        </div>
      </div>

      {/* Subagentes generados para mejorar la calidad */}
      <AnimatePresence>
        {agent.subagents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative mt-3 overflow-hidden"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-text-dim">
              <GitBranch className="h-3 w-3" style={{ color: agent.color }} />
              {agent.subagents.length} subagente{agent.subagents.length > 1 ? "s" : ""} · calidad
            </div>
            <div className="space-y-1.5 border-l border-dashed border-border pl-3">
              <AnimatePresence>
                {agent.subagents.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="rounded-lg border border-border bg-bg-soft/60 px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-text">
                        <Cpu className="h-3 w-3" style={{ color: agent.color }} />
                        {s.label}
                      </span>
                      {s.status === "done" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                      ) : (
                        <span className="text-[9px] uppercase tracking-wide text-text-dim">
                          {s.status === "spawning" ? "iniciando" : "trabajando"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-tight text-text-dim">{s.purpose}</p>
                    {s.status !== "done" && (
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: agent.color }}
                          animate={{ width: `${s.progress}%` }}
                          transition={{ ease: "easeOut", duration: 0.4 }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pie: calidad + completadas */}
      <div className="relative mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[10px] uppercase tracking-wide text-text-dim">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-scoring" />
          Calidad <span className="stat-num text-scoring">{Math.round(agent.qualityScore)}</span>
        </span>
        {onRun ? (
          <button
            data-testid="btn-agent-run"
            disabled={!enabled}
            onClick={() => onRun(agent)}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-40"
            style={{ color: agent.color, borderColor: `${agent.color}40` }}
          >
            <Play className="h-3 w-3" /> Ejecutar
          </button>
        ) : (
          <span>
            Completadas <span className="stat-num" style={{ color: agent.color }}>{agent.completedTasks}</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}
