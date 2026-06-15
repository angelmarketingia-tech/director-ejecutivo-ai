import { NextResponse } from "next/server";
import { runRaw, type ClaudeModel } from "@/lib/agents/claude";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/projects/step — una FASE del constructor de proyectos multi-agente.
 * El cliente orquesta las fases (1 llamada por fase = cabe en el límite de 60s):
 *   1) architect → PROJECT.md (especificación + criterios de aceptación)
 *   2) build     → proyecto funcional (HTML autónomo) a partir del PROJECT.md
 *   3) review    → QA: corrige y mejora el código, entrega versión final
 * Requiere ANTHROPIC_API_KEY. Sin clave lo dice (no inventa).
 */

const ARCHITECT_SYSTEM = `Eres ARQUITECTO de software senior. Recibes la idea de un proyecto y produces un
PROJECT.md claro y accionable en Markdown. Incluye: # Título, Objetivo, Usuarios, Stack
(para web: HTML+CSS+JS en UN archivo autónomo, sin dependencias externas salvo imágenes),
Páginas/Secciones, Componentes, Datos/Estado, y "## Criterios de aceptación" como lista
verificable (checkboxes "- [ ]"). Conciso pero completo y realista. Español de Colombia.
IMPORTANTE: escribe el PROJECT.md COMPLETO de principio a fin; NO lo cortes a media frase.
Devuelve solo el markdown en el campo projectMd.`;

const BUILD_SYSTEM = `Eres IMPLEMENTADOR full-stack senior. Recibes un PROJECT.md y construyes el proyecto
COMPLETO y FUNCIONAL como UN único archivo HTML autónomo (HTML + CSS en <style> + JS en <script>,
sin dependencias externas salvo imágenes de https://images.unsplash.com). DEBE abrir en el navegador
y funcionar SIN errores de consola. Implementa TODOS los criterios de aceptación del PROJECT.md.
Diseño moderno, responsivo y profesional. Si hay interactividad, impleméntala con JS vanilla.
Devuelve { html, summary }.`;

const REVIEW_SYSTEM = `Eres QA y Revisor senior. Recibes un PROJECT.md y un archivo HTML. Verifica: que cumpla los
criterios de aceptación, que NO tenga errores de JavaScript, que sea responsivo y accesible, y que
los enlaces/botones funcionen. DEVUELVES la versión FINAL corregida y mejorada en "html" (no rompas
lo que ya funciona) y una checklist en "notes" (qué verificaste y qué corregiste). Español de Colombia.`;

const SCHEMAS = {
  architect: {
    type: "object",
    additionalProperties: false,
    properties: { projectMd: { type: "string" }, summary: { type: "string" } },
    required: ["projectMd", "summary"],
  },
  build: {
    type: "object",
    additionalProperties: false,
    properties: { html: { type: "string" }, summary: { type: "string" } },
    required: ["html", "summary"],
  },
  review: {
    type: "object",
    additionalProperties: false,
    properties: { html: { type: "string" }, notes: { type: "array", items: { type: "string" } } },
    required: ["html", "notes"],
  },
} as const;

export async function POST(req: Request) {
  const rl = rateLimit(req, "project-step", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 60_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const phase = vstr((data as any)?.phase, 20);
  const prompt = vstr((data as any)?.prompt, 4000);
  const projectMd = vstr((data as any)?.projectMd, 20_000) ?? "";
  const code = vstr((data as any)?.code, 60_000) ?? "";
  if (!phase || !["architect", "build", "review"].includes(phase)) {
    return NextResponse.json({ ok: false, error: "Fase inválida" }, { status: 400 });
  }
  if (phase === "architect" && !prompt) {
    return NextResponse.json({ ok: false, error: "Falta 'prompt' del proyecto" }, { status: 400 });
  }

  // Modelos por fase: arquitectura razona (Sonnet, salida corta); build/review generan
  // mucho código (Haiku, rápido) para caber en 60s.
  const cfg: Record<string, { system: string; model: ClaudeModel; input: string; schema: any; maxTokens: number }> = {
    architect: {
      system: ARCHITECT_SYSTEM,
      model: "claude-sonnet-4-6",
      input: `Idea del proyecto:\n${prompt}`,
      schema: SCHEMAS.architect,
      maxTokens: 5000,
    },
    build: {
      system: BUILD_SYSTEM,
      model: "claude-haiku-4-5",
      input: `Construye el proyecto según este PROJECT.md:\n\n${projectMd || prompt}`,
      schema: SCHEMAS.build,
      maxTokens: 8000,
    },
    review: {
      system: REVIEW_SYSTEM,
      model: "claude-haiku-4-5",
      input: `PROJECT.md:\n${projectMd}\n\n--- HTML a revisar ---\n${code}`,
      schema: SCHEMAS.review,
      maxTokens: 8000,
    },
  };

  const c = cfg[phase];
  try {
    const res = await runRaw<any>({
      system: c.system,
      model: c.model,
      input: c.input,
      schema: c.schema as unknown as Record<string, unknown>,
      effort: "low",
      maxTokens: c.maxTokens,
    });
    return NextResponse.json({ ok: true, phase, budget: getBudget(), ...res.data });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ ok: false, noKey: true, error: "Sin ANTHROPIC_API_KEY no puedo construir el proyecto." });
    }
    return NextResponse.json({ ok: false, error: `Falló la fase ${phase}` }, { status: 500 });
  }
}
