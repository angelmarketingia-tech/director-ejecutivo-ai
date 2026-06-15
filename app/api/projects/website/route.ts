import { NextResponse } from "next/server";
import { runRaw } from "@/lib/agents/claude";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    html: { type: "string" },
    summary: { type: "string" },
  },
  required: ["html", "summary"],
} as const;

const SYSTEM = `Eres un diseñador y desarrollador web senior. Generas sitios web de UNA sola página,
modernos, responsivos y listos para mostrar a un cliente como DEMO de venta.

REGLAS DEL ENTREGABLE (campo "html"):
- Un único documento HTML completo y autónomo (un solo archivo), empezando por <!DOCTYPE html>.
- TODO el CSS dentro de una etiqueta <style> en el <head>. Sin frameworks ni dependencias externas de CSS/JS.
- Diseño atractivo, profesional y moderno (buena tipografía del sistema, espaciado, colores coherentes con el rubro).
- Totalmente responsivo (se ve bien en celular).
- Secciones: barra de navegación fija, hero con el NOMBRE del negocio + propuesta + botón CTA,
  servicios/menú (tarjetas), galería (usa imágenes de https://images.unsplash.com relevantes al rubro),
  "sobre nosotros", ubicación con un iframe de Google Maps usando la URL
  https://www.google.com/maps?q=NOMBRE+CIUDAD&output=embed, y pie de página.
- Botón flotante de WhatsApp si se proporciona teléfono (enlace https://wa.me/<solo-digitos>).
- Español de Colombia, tono cálido y comercial. Contenido plausible y específico del negocio (no "lorem ipsum").
- Es una DEMO: el contenido puede ser de ejemplo pero realista.`;

/**
 * POST /api/projects/website — genera un sitio web real (HTML autónomo) para un negocio.
 * Es un proyecto entregable: vista previa + descarga. Requiere ANTHROPIC_API_KEY.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "project-website", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 8_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const name = vstr(data?.name, 120);
  if (!name) return NextResponse.json({ ok: false, error: "Falta 'name' (nombre del negocio)" }, { status: 400 });
  const category = vstr(data?.category, 80) ?? "Negocio";
  const city = vstr(data?.city, 80) ?? "";
  const phone = vstr(data?.phone, 40) ?? "";
  const notes = vstr(data?.notes, 600) ?? "";

  const input =
    `Genera el sitio web DEMO de este negocio:\n` +
    JSON.stringify({ nombre: name, rubro: category, ciudad: city, telefono: phone, notas: notes }, null, 2);

  try {
    const res = await runRaw<{ html: string; summary: string }>({
      system: SYSTEM,
      // Una sola llamada (sin encadenar): Haiku genera el HTML completo rápido y cabe en 60s.
      model: "claude-haiku-4-5",
      input,
      schema: SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 8000,
    });
    return NextResponse.json({ ok: true, budget: getBudget(), html: res.data.html, summary: res.data.summary });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ ok: false, noKey: true, error: "Sin ANTHROPIC_API_KEY no puedo generar el sitio." });
    }
    return NextResponse.json({ ok: false, error: "No se pudo generar el sitio web" }, { status: 500 });
  }
}
