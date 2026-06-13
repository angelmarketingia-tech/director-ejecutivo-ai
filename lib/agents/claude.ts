/**
 * Cliente de Claude y helper `runAgent` para ejecutar los agentes del sistema.
 *
 * Modelos (ver lib/agents/prompts.ts y .env.example):
 *  - Director y razonamiento complejo → claude-fable-5 (más capaz).
 *  - Alto volumen (prospección, scoring) → claude-haiku-4-5 (rápido y económico).
 *
 * Salida estructurada: cada agente devuelve JSON validado contra un JSON Schema
 * vía `output_config.format`, así el worker recibe un objeto tipado sin parsing frágil.
 *
 * Fable 5: el pensamiento está siempre activo (no se envía `thinking`) y se incluye
 * por defecto el fallback server-side a Opus 4.8 ante un posible `refusal`.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { AgentId } from "@/lib/types";
import { AGENT_PROMPTS } from "@/lib/agents/prompts";
import { env } from "@/lib/integrations/config";
import { PRESETS, type Preset } from "@/lib/agents/pricing";
import { canSpend, recordUsage, BudgetExceededError } from "@/lib/agents/budget";

export type ClaudeModel =
  | "claude-fable-5"
  | "claude-opus-4-8"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

// Preset activo por defecto del servidor (sobrescribible por env o por petición).
const ACTIVE_PRESET: Preset =
  (process.env.AGENT_PRESET as Preset) || "equilibrada";

/** Resuelve el modelo de un agente según el preset (económica/equilibrada/premium). */
function modelForAgent(agent: AgentId, preset: Preset = ACTIVE_PRESET): ClaudeModel {
  return PRESETS[preset][agent];
}

let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!env.anthropicKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no configurada. Añádela en .env.local para activar los agentes reales."
    );
  }
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicKey });
  return _client;
}

export interface RunAgentOptions {
  agent: AgentId;
  /** Mensaje de usuario / datos de la tarea (texto o JSON serializado). */
  input: string;
  /** JSON Schema de la salida esperada. */
  schema: Record<string, unknown>;
  model?: ClaudeModel;
  /** Preset de costo: define el modelo si no se pasa `model`. */
  preset?: Preset;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}

export interface RunAgentResult<T = unknown> {
  data: T;
  model: string;
  refused: boolean;
  usage?: Anthropic.Usage | null;
}

/**
 * Ejecuta un agente y devuelve su salida estructurada ya parseada.
 * Lanza si el modelo rechaza la petición incluso tras el fallback.
 */
export async function runAgent<T = unknown>(
  opts: RunAgentOptions
): Promise<RunAgentResult<T>> {
  return runRaw<T>({
    system: AGENT_PROMPTS[opts.agent],
    model: opts.model ?? modelForAgent(opts.agent, opts.preset),
    input: opts.input,
    schema: opts.schema,
    effort: opts.effort,
    maxTokens: opts.maxTokens,
  });
}

export interface RunRawOptions {
  /** System prompt ya resuelto (de AGENT_PROMPTS o construido para un agente de área). */
  system: string;
  model: ClaudeModel;
  input: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}

/**
 * Ejecuta Claude con un system prompt arbitrario. Es la base de `runAgent` y permite
 * correr cualquier agente de área (no solo los 6 comerciales) con su propio rol.
 */
export async function runRaw<T = unknown>(
  opts: RunRawOptions
): Promise<RunAgentResult<T>> {
  const client = getClient();
  const model = opts.model;
  const system = opts.system;
  const maxTokens = opts.maxTokens ?? 8000;

  // GUARDA DE PRESUPUESTO: no llamar si ya se alcanzó el tope diario de gasto de API.
  if (!canSpend(0.005)) {
    throw new BudgetExceededError(
      "Tope de gasto diario de la API alcanzado. Ajusta LIMIT_API_SPEND_USD o espera al reinicio diario."
    );
  }

  // `effort` NO es soportado por Haiku 4.5 (devuelve 400). Solo se envía a modelos
  // que lo aceptan (Fable 5, Opus 4.x, Sonnet 4.6).
  const supportsEffort = model !== "claude-haiku-4-5";
  const outputConfig: {
    format: { type: "json_schema"; schema: Record<string, unknown> };
    effort?: "low" | "medium" | "high" | "xhigh" | "max";
  } = {
    format: { type: "json_schema", schema: opts.schema },
  };
  if (supportsEffort) outputConfig.effort = opts.effort ?? "high";

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: opts.input },
  ];

  if (model === "claude-fable-5") {
    // Fable 5: pensamiento siempre activo (omitir `thinking`) + fallback a Opus 4.8.
    const res = await client.beta.messages.create({
      model,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system,
      output_config: outputConfig,
      messages,
    });
    recordUsage((res.model as ClaudeModel) ?? model, res.usage);
    if (res.stop_reason === "refusal") {
      return { data: null as T, model: res.model, refused: true, usage: res.usage };
    }
    return {
      data: extractJson<T>(res.content),
      model: res.model,
      refused: false,
      usage: res.usage,
    };
  }

  // Opus 4.8 / Haiku 4.5
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    output_config: outputConfig,
    messages: [{ role: "user", content: opts.input }],
  });
  recordUsage(model, res.usage);
  return {
    data: extractJson<T>(res.content as any),
    model: res.model,
    refused: res.stop_reason === "refusal",
    usage: res.usage,
  };
}

function extractJson<T>(content: Array<{ type: string; text?: string }>): T {
  const text = content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta del agente no es JSON válido: ${text.slice(0, 200)}`);
  }
}
