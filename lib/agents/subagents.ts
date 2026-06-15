/**
 * Subagentes: cualquier agente puede generar subagentes especialistas para mejorar
 * la CALIDAD de su entregable (no para ir más rápido). Patrón:
 *   1) Borrador del agente principal.
 *   2) Fan-out a N subagentes (verificador, crítico de calidad, especialista…) que
 *      critican el borrador desde su lente, en paralelo.
 *   3) Síntesis: el agente principal integra las críticas en una versión mejor.
 *
 * Funciona con cualquier agente (comercial o de área) vía `runRaw` + un system prompt.
 */
import { runRaw, type ClaudeModel } from "@/lib/agents/claude";

export interface SubagentSpec {
  label: string; // ej. "Verificador de hechos"
  /** Instrucción/lente del subagente para criticar el borrador. */
  instruction: string;
}

const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    qualityScore: { type: "integer" },
    issues: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    verdict: { type: "string", enum: ["ship", "revise", "reject"] },
  },
  required: ["qualityScore", "issues", "suggestions", "verdict"],
} as const;

export interface SubagentReport extends SubagentSpec {
  qualityScore: number;
  issues: string[];
  suggestions: string[];
  verdict: "ship" | "revise" | "reject";
}

export interface WithSubagentsResult<T> {
  data: T;
  draft: T;
  reports: SubagentReport[];
  improved: boolean;
}

/**
 * Ejecuta un agente con asistencia de subagentes para elevar la calidad.
 * `subagents` define qué especialistas crear; si no se pasan, no hay fan-out.
 */
export async function runWithSubagents<T = unknown>(opts: {
  system: string;
  model: ClaudeModel;
  input: string;
  schema: Record<string, unknown>;
  subagents?: SubagentSpec[];
  maxTokens?: number;
  /** Si false, NO hace la 3ª llamada de síntesis (más rápido, cabe en 60s). Defecto true. */
  synthesize?: boolean;
}): Promise<WithSubagentsResult<T>> {
  // 1) Borrador (effort bajo para que la corrida completa quepa en el límite de 60s)
  const draftRes = await runRaw<T>({
    system: opts.system,
    model: opts.model,
    input: opts.input,
    schema: opts.schema,
    effort: "low",
    maxTokens: opts.maxTokens,
  });
  const draft = draftRes.data;

  const specs = opts.subagents ?? [];
  if (specs.length === 0) {
    return { data: draft, draft, reports: [], improved: false };
  }

  // 2) Fan-out a subagentes (en paralelo): cada uno critica el borrador desde su lente
  const draftStr = JSON.stringify(draft, null, 2);
  const reports = await Promise.all(
    specs.map(async (spec) => {
      const r = await runRaw<Omit<SubagentReport, keyof SubagentSpec>>({
        system: opts.system,
        model: opts.model,
        input:
          `Actúas como subagente "${spec.label}". ${spec.instruction}\n` +
          `Critica el siguiente borrador con rigor (objetivo: mejorar la calidad, no aprobarlo):\n${draftStr}`,
        schema: CRITIQUE_SCHEMA as unknown as Record<string, unknown>,
        effort: "low",
        maxTokens: 2000,
      });
      return { ...spec, ...r.data } as SubagentReport;
    })
  );

  // Modo rápido: devuelve el borrador completo + las críticas (sin 3ª llamada).
  // Evita el timeout de 60s en tareas de contenido largo, conservando el detalle del borrador.
  if (opts.synthesize === false) {
    return { data: draft, draft, reports, improved: false };
  }

  // 3) ¿Hace falta revisar? Si todos dicen "ship" sin sugerencias, el borrador ya es bueno.
  const needsRevision = reports.some(
    (r) => r.verdict !== "ship" || r.suggestions.length > 0
  );
  if (!needsRevision) {
    return { data: draft, draft, reports, improved: false };
  }

  // 4) Síntesis: el agente integra las críticas en una versión mejor
  const synthRes = await runRaw<T>({
    system: opts.system,
    model: opts.model,
    input:
      `${opts.input}\n\n--- Borrador previo ---\n${draftStr}\n\n` +
      `--- Críticas de subagentes (intégralas para mejorar la calidad) ---\n` +
      JSON.stringify(reports, null, 2) +
      `\n\nDevuelve la versión final mejorada que resuelve los problemas señalados. Sé conciso y accionable.`,
    schema: opts.schema,
    effort: "low",
    maxTokens: opts.maxTokens,
  });

  return { data: synthRes.data, draft, reports, improved: true };
}
