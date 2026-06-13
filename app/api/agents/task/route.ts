import { NextResponse } from "next/server";
import { buildAreaAgentSystem } from "@/lib/agents/prompts";
import { runWithSubagents, type SubagentSpec } from "@/lib/agents/subagents";
import { PRESETS, type Preset } from "@/lib/agents/pricing";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";

export const runtime = "nodejs";
// 60s = compatible con el plan Hobby de Vercel. En Pro súbelo a 300 para corridas
// largas de Fable 5 (preset Premium con subagentes).
export const maxDuration = 60;

const DELIVERABLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    deliverable: { type: "string" },
    summary: { type: "string" },
    qualitySelfScore: { type: "integer" },
  },
  required: ["deliverable", "summary", "qualitySelfScore"],
} as const;

type Body = {
  name: string; // codename del agente, ej. PRISM
  role: string; // rol, ej. "Contenido y narrativa"
  area: string; // ej. "Marketing"
  task: string; // tarea a ejecutar de inicio a fin
  subagents?: SubagentSpec[]; // especialistas a crear (calidad)
  preset?: Preset; // económica | equilibrada | premium
};

/**
 * POST /api/agents/task
 * Ejecuta un agente de cualquier área de inicio a fin, generando subagentes para
 * elevar la calidad (borrador → críticas → síntesis). Requiere ANTHROPIC_API_KEY.
 */
export async function POST(req: Request) {
  // Seguridad: rate limit, tamaño, auth opcional, validación estricta.
  const rl = rateLimit(req, "agents-task", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 12_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const body = data as Body;
  const name = vstr(body?.name, 40);
  const role = vstr(body?.role, 120) ?? "Agente";
  const area = vstr(body?.area, 40) ?? "General";
  const task = vstr(body?.task, 4000);
  if (!name || !task) {
    return NextResponse.json({ ok: false, error: "Faltan 'name' y/o 'task' válidos" }, { status: 400 });
  }
  // Subagentes saneados (cap de longitudes), o por defecto verificador + crítico.
  const cleanSubs: SubagentSpec[] = (Array.isArray(body?.subagents) ? body.subagents.slice(0, 4) : [])
    .map((s) => ({ label: vstr(s?.label, 60) ?? "", instruction: vstr(s?.instruction, 400) ?? "" }))
    .filter((s) => s.label && s.instruction);
  const subagents: SubagentSpec[] =
    cleanSubs.length > 0
      ? cleanSubs
      : [
          { label: "Verificador", instruction: "Refuta el borrador: busca errores, vacíos y afirmaciones sin respaldo." },
          { label: "Crítico de calidad", instruction: "Eleva el estándar: claridad, rigor y utilidad para el equipo." },
        ];

  const preset: Preset = (["economica", "equilibrada", "premium"] as const).includes(body?.preset as Preset)
    ? (body.preset as Preset)
    : "equilibrada";
  const model = PRESETS[preset].email; // modelo del agente para la tarea, según preset

  try {
    const result = await runWithSubagents<{
      deliverable: string;
      summary: string;
      qualitySelfScore: number;
    }>({
      system: buildAreaAgentSystem(name, role, area),
      model,
      input: `Tarea (de inicio a fin): ${task}`,
      schema: DELIVERABLE_SCHEMA as unknown as Record<string, unknown>,
      subagents,
      maxTokens: 6000,
    });
    return NextResponse.json({ ok: true, model, budget: getBudget(), ...result });
  } catch (err: any) {
    // Casos esperados (sin clave / tope de presupuesto): HTTP 200 con bandera, para
    // NO ensuciar la consola del navegador con errores rojos. El cliente cae a demo.
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: msg,
        hint: "Configura ANTHROPIC_API_KEY en .env.local para ejecutar agentes reales con subagentes.",
      });
    }
    // Error inesperado real → 500
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
