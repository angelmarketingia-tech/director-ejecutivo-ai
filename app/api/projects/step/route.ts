import { NextResponse } from "next/server";
import { runRaw, type ClaudeModel } from "@/lib/agents/claude";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { searchImagesMulti, imagesEnabled } from "@/lib/integrations/images";
import { withSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro

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
Para una landing, propón 5-7 secciones potentes (hero, servicios, prueba social, galería, precios/proceso, CTA, footer).
IMPORTANTE: escribe el PROJECT.md COMPLETO de principio a fin; NO lo cortes a media frase.
Además, en "imageQueries" devuelve 4-6 términos de búsqueda EN INGLÉS para fotos de stock
relevantes al proyecto (ej. "llanero restaurant grilled meat", "cozy cafe interior",
"barbershop haircut"). Específicos del rubro, no genéricos. Devuelve projectMd + imageQueries.`;

const BUILD_SYSTEM = `Eres un INGENIERO FRONT-END SENIOR y diseñador de producto de clase mundial (nivel
agencia premium / calidad Awwwards). Construyes una web de UNA sola página en UN archivo HTML
autónomo, con acabado PROFESIONAL ALTO. Nada de plantillas genéricas ni resultados "básicos".

ESTÁNDARES OBLIGATORIOS DE NIVEL SENIOR:
- Tipografía premium: carga Google Fonts en el <head> con un pairing de alto nivel (p. ej. display
  "Sora"/"Fraunces"/"Space Grotesk" + texto "Inter"/"Plus Jakarta Sans"). Escala tipográfica FLUIDA con clamp().
- Sistema de diseño con CSS custom properties en :root (colores, espaciado, radios, sombras, transiciones).
  Paleta cohesiva y moderna con 1 acento fuerte y gradientes/mesh sutiles. Considera modo oscuro elegante.
- Layout con CSS Grid/Flex, mucho aire (whitespace), ritmo vertical consistente, contenedores con max-width.
- HERO impactante: titular grande con clamp(), fondo con gradiente/mesh sutil, CTA con estados, social proof/badges.
- Micro-interacciones: transiciones suaves en hover (botones con brillo, tarjetas con elevación), :focus-visible.
- Animaciones de entrada al hacer scroll con IntersectionObserver (fade + translate sutiles, performantes).
- Componentes pulidos: navbar con cambio al hacer scroll, tarjetas con borde/sombra fina, ICONOS como SVG inline,
  secciones (hero, características/servicios, prueba social/testimonios, CTA final, footer completo).
- Imágenes: usa EXCLUSIVAMENTE las URLs reales provistas en "IMÁGENES DISPONIBLES" (NO inventes URLs;
  las inventadas se rompen). Úsalas con loading="lazy", object-fit: cover y alt descriptivo. Apóyate en ellas
  para un hero a pantalla, galería y fondos con overlay. Si NO se provee ninguna, NO uses <img> externas:
  crea visuales premium con CSS (gradientes/mesh, formas SVG, patrones) para que NUNCA haya imágenes rotas.
- Responsivo impecable mobile-first, SIN scroll horizontal.
- Accesibilidad: HTML semántico (<header><main><section><footer>), contraste AA, alt en imágenes, aria donde aplique.
- JS vanilla, mínimo y SIN errores de consola. Sin frameworks. Única dependencia externa permitida: Google Fonts + Unsplash.

CALIDAD MÁXIMA: 5-7 secciones potentes y bien diseñadas (hero, características/servicios, prueba social/
testimonios, galería con las imágenes reales, precios o proceso, CTA final, footer completo). CSS limpio y
organizado. Usa TODAS las imágenes provistas. Es OBLIGATORIO entregar el HTML COMPLETO de principio a fin.

Implementa TODOS los criterios del PROJECT.md con detalle y pulido de portafolio senior. Copy real (no lorem),
español de Colombia. Devuelve { html, summary }.`;

const REVIEW_SYSTEM = `Eres DIRECTOR DE ARTE + QA front-end senior. Recibes un PROJECT.md y un HTML ya construido.
NO reescribas el HTML (es grande). Tu trabajo es AUDITARLO y reportar en "notes" una checklist concreta:
qué criterios de aceptación cumple, posibles errores de JS, problemas de responsive/accesibilidad/contraste,
y mejoras puntuales recomendadas. Sé específico y honesto. Español de Colombia. Devuelve solo "notes".`;

const SCHEMAS = {
  architect: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectMd: { type: "string" },
      summary: { type: "string" },
      imageQueries: { type: "array", items: { type: "string" } },
    },
    required: ["projectMd", "summary", "imageQueries"],
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
    properties: { notes: { type: "array", items: { type: "string" } } },
    required: ["notes"],
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
  const imageQueries: string[] = Array.isArray((data as any)?.imageQueries)
    ? (data as any).imageQueries.map((q: any) => vstr(q, 80)).filter(Boolean).slice(0, 6)
    : [];
  if (!phase || !["architect", "build", "review"].includes(phase)) {
    return NextResponse.json({ ok: false, error: "Fase inválida" }, { status: 400 });
  }
  if (phase === "architect" && !prompt) {
    return NextResponse.json({ ok: false, error: "Falta 'prompt' del proyecto" }, { status: 400 });
  }

  // Imágenes REALES para el build (URLs que sí cargan, relevantes al rubro).
  // Límite de fotos para mantener la página ágil y caber en los 60s del plan Hobby.
  let imagesBlock = "";
  if (phase === "build") {
    const queries = (imageQueries.length ? imageQueries : prompt ? [prompt] : []).slice(0, 6);
    const imgs = queries.length ? await searchImagesMulti(queries, 2) : [];
    imagesBlock = imgs.length
      ? `\n\n--- IMÁGENES DISPONIBLES (usa SOLO estas URLs reales) ---\n` +
        imgs.map((i, n) => `${n + 1}. ${i.url}  (alt: ${i.alt})`).join("\n")
      : `\n\n(NO hay imágenes provistas: usa visuales premium por CSS — gradientes/mesh/SVG — y NO uses <img> externas.)`;
  }

  // Vercel Pro (300s): Sonnet 4.6 en todas las fases para máxima calidad.
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
      model: "claude-sonnet-4-6",
      input: `Construye el proyecto según este PROJECT.md:\n\n${projectMd || prompt}${imagesBlock}`,
      schema: SCHEMAS.build,
      maxTokens: 16000,
    },
    review: {
      system: REVIEW_SYSTEM,
      model: "claude-sonnet-4-6",
      input: `PROJECT.md:\n${projectMd}\n\n--- HTML a auditar ---\n${code}`,
      schema: SCHEMAS.review,
      maxTokens: 2200,
    },
  };

  const c = cfg[phase];
  try {
    const res = await withSpend(req, `proyecto:${phase}`, () =>
      runRaw<any>({
        system: c.system,
        model: c.model,
        input: c.input,
        schema: c.schema as unknown as Record<string, unknown>,
        effort: "low",
        maxTokens: c.maxTokens,
      })
    );
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
