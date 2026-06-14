import { NextResponse } from "next/server";
import { searchPlacesApify } from "@/lib/integrations/apify";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { saveLeads } from "@/lib/leadstore";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/leads/apify — negocios reales (con teléfono/email) vía Apify Google Maps.
 * Requiere APIFY_TOKEN. Sin token lo dice (no inventa).
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "apify", 6, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 4_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const niche = vstr(data?.niche, 120);
  const city = vstr(data?.city, 80);
  if (!niche || !city) return NextResponse.json({ ok: false, error: "Faltan 'niche' y 'city'" }, { status: 400 });
  const count = Math.min(Math.max(Number(data?.count) || 8, 1), 20);

  try {
    const leads = await searchPlacesApify({ niche, city, count });
    await saveLeads(leads as any);
    const note =
      leads.length === 0
        ? "Apify no devolvió resultados para ese nicho/ciudad."
        : `${leads.length} negocios reales de Google Maps (con teléfono/web) vía Apify.`;
    return NextResponse.json({ ok: true, leads, note });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("APIFY_TOKEN")) {
      return NextResponse.json({
        ok: false,
        noToken: true,
        error: "Falta APIFY_TOKEN. Pégalo en Vercel para usar Apify. No invento datos.",
      });
    }
    return NextResponse.json({ ok: false, error: "No se pudo consultar Apify" }, { status: 502 });
  }
}
