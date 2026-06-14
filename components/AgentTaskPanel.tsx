"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AreaAgent } from "@/lib/types";
import { useDeck } from "@/lib/store";
import { useEscape } from "@/lib/useEscape";
import { SUBAGENT_PLAYBOOK } from "@/lib/departments";
import { cn } from "@/lib/utils";
import { X, Play, GitBranch, CheckCircle2, AlertTriangle, Sparkles, Loader2, Cpu } from "lucide-react";

interface Report {
  label: string;
  qualityScore: number;
  issues: string[];
  suggestions: string[];
  verdict: "ship" | "revise" | "reject";
}
interface Result {
  data: { deliverable: string; summary: string; qualitySelfScore: number };
  reports: Report[];
  improved: boolean;
  demo?: boolean;
}

const VERDICT = {
  ship: { label: "Aprobado", tint: "#34D399" },
  revise: { label: "Revisar", tint: "#FBBF24" },
  reject: { label: "Rechazar", tint: "#FB7185" },
} as const;

export function AgentTaskPanel({
  agent,
  area,
  onClose,
}: {
  agent: AreaAgent | null;
  area: string;
  onClose: () => void;
}) {
  const preset = useDeck((s) => s.preset);
  const subagentsEnabled = useDeck((s) => s.subagentsEnabled);
  useEscape(!!agent, onClose);
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset al cambiar de agente
  const [lastId, setLastId] = useState<string | undefined>();
  if (agent?.id !== lastId) {
    setLastId(agent?.id);
    setTask(agent?.task ?? "");
    setStatus("idle");
    setResult(null);
    setError(null);
  }

  // Económico: sin subagentes (más barato). Calidad: con subagentes (más tokens).
  const specs = subagentsEnabled
    ? (SUBAGENT_PLAYBOOK[agent?.name ?? ""] ?? SUBAGENT_PLAYBOOK.default)
        .slice(0, 2)
        .map((s) => ({ label: s.label, instruction: s.purpose }))
    : [];

  async function run() {
    if (!agent || !task.trim()) return;
    setStatus("running");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agent.name, role: agent.role, area, task: task.trim(), subagents: specs, preset }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json);
        setStatus("done");
      } else if (json.budgetExceeded) {
        setError(`Tope de gasto diario alcanzado ($${json.budget?.capUsd ?? "?"}). Ajusta el límite en Configuración o espera al reinicio diario.`);
        setStatus("error");
      } else if (json.noKey) {
        // Sin API key: ejemplo simulado para mostrar el flujo (borrador → subagentes → síntesis)
        setResult(simulate(agent.name, task.trim(), specs));
        setStatus("done");
      } else {
        setError(json.error ?? "Error desconocido");
        setStatus("error");
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {agent && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-bg-soft shadow-panel"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl font-mono text-[12px] font-semibold"
                  style={{ background: `${agent.color}1a`, color: agent.color }}
                >
                  {agent.name.slice(0, 2)}
                </div>
                <div className="leading-tight">
                  <p className="text-[15px] font-semibold text-text">{agent.name}</p>
                  <p className="text-[11px] text-text-dim">{agent.role} · {area}</p>
                </div>
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="label-eyebrow mb-2">Tarea (de inicio a fin)</p>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-prospect/50"
              />

              <p className="label-eyebrow mb-2 mt-4">
                {specs.length ? "Subagentes que se crearán (calidad)" : "Modo económico (sin subagentes)"}
              </p>
              {specs.length === 0 && (
                <p className="rounded-lg border border-border bg-surface/50 px-3 py-2 text-[11px] text-text-dim">
                  Ahorro de tokens activo. Para máxima calidad, activa “Subagentes” en Configuración.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-start gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2">
                    <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: agent.color }} />
                    <div className="leading-tight">
                      <p className="text-[12px] font-medium text-text">{s.label}</p>
                      <p className="text-[10px] text-text-dim">{s.instruction}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                data-testid="btn-task-run"
                onClick={run}
                disabled={status === "running" || !task.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-prospect/15 py-2.5 text-[13px] font-semibold text-prospect transition-colors hover:bg-prospect/25 disabled:opacity-40"
              >
                {status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {status === "running" ? "Ejecutando con subagentes…" : "Ejecutar de inicio a fin"}
              </button>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {result && (
                <div className="mt-5 space-y-4">
                  {result.demo && (
                    <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] text-warn">
                      Ejemplo simulado (sin ANTHROPIC_API_KEY). Configúrala para ejecutar a Claude real.
                    </p>
                  )}

                  {/* Subagentes */}
                  <div>
                    <p className="label-eyebrow mb-2 flex items-center gap-1.5">
                      <GitBranch className="h-3 w-3" style={{ color: agent.color }} /> Críticas de subagentes
                    </p>
                    <div className="space-y-2">
                      {result.reports.map((r) => (
                        <div key={r.label} className="rounded-lg border border-border bg-surface/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-text">{r.label}</span>
                            <span className="flex items-center gap-2 text-[10px]">
                              <span className="stat-num text-scoring">{r.qualityScore}</span>
                              <span className="rounded px-1.5 py-0.5 font-medium" style={{ color: VERDICT[r.verdict].tint, background: `${VERDICT[r.verdict].tint}14` }}>
                                {VERDICT[r.verdict].label}
                              </span>
                            </span>
                          </div>
                          {r.suggestions.length > 0 && (
                            <ul className="mt-1.5 space-y-1">
                              {r.suggestions.slice(0, 3).map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-muted">
                                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: agent.color }} />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Entregable final */}
                  <div>
                    <p className="label-eyebrow mb-2 flex items-center gap-1.5">
                      {result.improved ? <Sparkles className="h-3 w-3 text-ok" /> : <CheckCircle2 className="h-3 w-3 text-ok" />}
                      Entregable {result.improved ? "mejorado tras síntesis" : "final"}
                      <span className="ml-auto stat-num text-scoring">calidad {result.data.qualitySelfScore}</span>
                    </p>
                    <div className="rounded-lg border border-border bg-bg p-3">
                      <p data-testid="task-deliverable" className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-text">{result.data.deliverable}</p>
                      {result.data.summary && (
                        <p className="mt-2 border-t border-border pt-2 text-[11px] text-text-dim">{result.data.summary}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Ejemplo simulado cuando no hay API key (muestra el flujo completo). */
function simulate(name: string, task: string, specs: { label: string; instruction: string }[]): Result {
  return {
    demo: true,
    improved: true,
    reports: specs.map((s, i) => ({
      label: s.label,
      qualityScore: 72 + i * 6,
      issues: ["Faltaba un dato de respaldo", "El cierre podía ser más claro"].slice(0, 2 - i),
      suggestions: [
        i === 0 ? "Añadir una métrica concreta que sustente la propuesta" : "Reforzar la llamada a la acción y acortar el cuerpo",
      ],
      verdict: i === 0 ? "revise" : "ship",
    })),
    data: {
      deliverable: `[${name}] Resultado de: "${task}".\n\nVersión final tras integrar las críticas de los subagentes: entregable claro, con respaldo y llamada a la acción afilada, listo para revisión humana.`,
      summary: "Borrador → 2 subagentes críticos → síntesis. Calidad por encima de velocidad.",
      qualitySelfScore: 91,
    },
  };
}
