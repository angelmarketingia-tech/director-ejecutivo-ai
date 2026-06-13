// Precios reales de la API de Claude, presets de modelo por agente y calculadora de
// costo por lead / proyección mensual. Sin dependencias de servidor: seguro en cliente.

import type { AgentId } from "@/lib/types";
import type { ClaudeModel } from "@/lib/agents/claude";

const M = 1_000_000;

/** USD por token (entrada / salida). Fuente: precios oficiales por millón de tokens. */
export const PRICES: Record<ClaudeModel, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1 / M, out: 5 / M },
  "claude-sonnet-4-6": { in: 3 / M, out: 15 / M },
  "claude-opus-4-8": { in: 5 / M, out: 25 / M },
  "claude-fable-5": { in: 10 / M, out: 50 / M },
};

export type Preset = "economica" | "equilibrada" | "premium";
export type ChannelsMode = "full" | "no_voice";

export const PRESET_LABEL: Record<Preset, string> = {
  economica: "Económica",
  equilibrada: "Equilibrada",
  premium: "Premium",
};

/** Modelo por agente según preset. */
export const PRESETS: Record<Preset, Record<AgentId, ClaudeModel>> = {
  economica: {
    prospect: "claude-haiku-4-5",
    scoring: "claude-haiku-4-5",
    research: "claude-haiku-4-5",
    email: "claude-haiku-4-5",
    voice: "claude-haiku-4-5",
    director: "claude-haiku-4-5",
  },
  equilibrada: {
    prospect: "claude-haiku-4-5",
    scoring: "claude-haiku-4-5",
    research: "claude-sonnet-4-6",
    email: "claude-sonnet-4-6",
    voice: "claude-sonnet-4-6",
    director: "claude-sonnet-4-6",
  },
  premium: {
    prospect: "claude-fable-5",
    scoring: "claude-fable-5",
    research: "claude-fable-5",
    email: "claude-fable-5",
    voice: "claude-fable-5",
    director: "claude-fable-5",
  },
};

/** Tokens estimados por paso del pipeline, por lead (email incluye subagentes). */
const STEP_TOKENS: Record<AgentId, { in: number; out: number }> = {
  prospect: { in: 800, out: 500 },
  research: { in: 700, out: 350 },
  scoring: { in: 600, out: 200 },
  email: { in: 2500, out: 1500 }, // borrador + 2 subagentes + síntesis
  voice: { in: 800, out: 450 },
  director: { in: 500, out: 300 },
};

/** Fable 5 razona siempre: la salida real (con thinking) es mucho mayor. */
function thinkingMult(model: ClaudeModel): number {
  return model === "claude-fable-5" ? 4 : 1;
}

/** Costo USD de un paso de agente con un modelo dado. */
export function costForStep(agent: AgentId, model: ClaudeModel): number {
  const t = STEP_TOKENS[agent];
  const p = PRICES[model];
  return t.in * p.in + t.out * thinkingMult(model) * p.out;
}

/** Fracción de leads que escalan a llamada de voz (solo en modo completo). */
const HOT_FRACTION = 0.4;
/** El director se amortiza en pocas llamadas por lead. */
const DIRECTOR_PER_LEAD = 0.2;

/** Costo estimado en API de Claude por lead procesado, según preset y canales. */
export function costPerLead(preset: Preset, channels: ChannelsMode): number {
  const m = PRESETS[preset];
  let total = 0;
  total += costForStep("prospect", m.prospect);
  total += costForStep("research", m.research);
  total += costForStep("scoring", m.scoring);
  total += costForStep("email", m.email);
  total += costForStep("director", m.director) * DIRECTOR_PER_LEAD;
  if (channels === "full") total += costForStep("voice", m.voice) * HOT_FRACTION;
  return total;
}

/** Proyección mensual de la API de Claude para N leads/semana. */
export function monthlyApiCost(preset: Preset, channels: ChannelsMode, leadsPerWeek = 200): number {
  return costPerLead(preset, channels) * leadsPerWeek * 4.345;
}

/** Estimación gruesa de canales externos (email/WhatsApp/voz) por mes. */
export function monthlyChannelsCost(channels: ChannelsMode, leadsPerWeek = 200): { low: number; high: number } {
  const perMonth = leadsPerWeek * 4.345;
  // email+whatsapp: capas gratuitas amplias → bajo
  let low = 0;
  let high = 20;
  if (channels === "full") {
    // ~40% llaman, 3 min, $0.10–$0.30/min
    const calls = perMonth * HOT_FRACTION;
    low += calls * 3 * 0.1;
    high += calls * 3 * 0.3;
  }
  return { low: Math.round(low), high: Math.round(high) };
}

export const fmtUsd = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${Math.round(n)}`);
