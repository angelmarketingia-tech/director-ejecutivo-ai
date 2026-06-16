import { NextResponse } from "next/server";
import { runRaw } from "@/lib/agents/claude";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { withSpend } from "@/lib/spendlog";
import { searchImagesMulti } from "@/lib/integrations/images";
import { higgsfieldHeroFor } from "@/lib/integrations/higgsfield";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    html: { type: "string" },
    summary: { type: "string" },
  },
  required: ["html", "summary"],
} as const;

const SYSTEM = `Eres un INGENIERO FRONT-END SENIOR y diseñador de producto de clase mundial (nivel agencia
premium / calidad Awwwards). Generas un sitio web DEMO de UNA sola página, en UN archivo HTML
autónomo, con acabado PROFESIONAL ALTO para enamorar a un cliente. Nada genérico ni "básico".

ESTÁNDARES OBLIGATORIOS:
- Tipografía premium: carga Google Fonts en el <head> con un pairing de alto nivel (display "Sora"/
  "Fraunces"/"Space Grotesk" + texto "Inter"/"Plus Jakarta Sans"). Escala fluida con clamp().
- Sistema de diseño con CSS custom properties en :root (colores del rubro, espaciado, radios, sombras).
  Paleta cohesiva moderna con 1 acento fuerte y gradientes/mesh sutiles.
- Layout con Grid/Flex, mucho aire, ritmo vertical consistente, contenedores con max-width.
- HERO impactante a pantalla: usa la imagen HERO provista (#1) como fondo con overlay/gradiente para
  legibilidad, titular grande con clamp(), subtítulo, y CTA con estados.
- Micro-interacciones (hover con brillo/elevación, :focus-visible) y animaciones de entrada al hacer
  scroll con IntersectionObserver (fade + translate sutiles, performantes).
- Navbar fija con cambio al hacer scroll, ICONOS como SVG inline.
- Imágenes: usa EXCLUSIVAMENTE las URLs reales provistas en "IMÁGENES DISPONIBLES" (NO inventes URLs;
  las inventadas se rompen). loading="lazy", object-fit: cover, alt descriptivo. La #1 es el HERO.
  Si NO se provee ninguna, NO uses <img> externas: crea visuales premium con CSS (gradientes/mesh/SVG).
- Responsivo impecable mobile-first, SIN scroll horizontal. Accesibilidad: HTML semántico, contraste AA.
- JS vanilla mínimo y SIN errores de consola. Única dependencia externa: Google Fonts + las imágenes provistas.

SECCIONES (5 potentes): navbar fija → hero con NOMBRE del negocio + propuesta + CTA → servicios/menú
(tarjetas) → galería con las imágenes reales → prueba social/sobre nosotros → ubicación con iframe de
Google Maps (https://www.google.com/maps?q=NOMBRE+CIUDAD&output=embed) + CTA final + footer.
Botón flotante de WhatsApp si hay teléfono (https://wa.me/<solo-digitos>).
Español de Colombia, tono cálido y comercial, copy REAL y específico del negocio (no lorem).
CRÍTICO: entrega el HTML COMPLETO de principio a fin sin cortarte; CSS compacto; ~20-30 KB. Devuelve { html, summary }.`;

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

  // Imágenes REALES: hero premium curado de Higgsfield (por rubro) + fotos de stock (Pexels) para galería.
  const hero = higgsfieldHeroFor(category);
  const stockQueries = [category, `${category} ${city}`.trim(), name].filter(Boolean);
  const stock = await searchImagesMulti(stockQueries, 1);
  const images = [...hero, ...stock.filter((s) => !hero.some((h) => h.url === s.url))].slice(0, 6);
  const imagesBlock = images.length
    ? `\n\n--- IMÁGENES DISPONIBLES (usa SOLO estas URLs reales; la #1 es el HERO premium, úsala a pantalla completa con overlay) ---\n` +
      images.map((i, n) => `${n + 1}. ${i.url}  (alt: ${i.alt})`).join("\n")
    : `\n\n(NO hay imágenes provistas: usa visuales premium por CSS — gradientes/mesh/SVG — y NO uses <img> externas para no romper la página.)`;

  const input =
    `Genera el sitio web DEMO de este negocio:\n` +
    JSON.stringify({ nombre: name, rubro: category, ciudad: city, telefono: phone, notas: notes }, null, 2) +
    imagesBlock;

  try {
    const res = await withSpend(req, `web:${name}`, () =>
      runRaw<{ html: string; summary: string }>({
        system: SYSTEM,
        model: "claude-sonnet-4-6", // Vercel Pro: máxima calidad de diseño
        input,
        schema: SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 14000,
      })
    );
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
