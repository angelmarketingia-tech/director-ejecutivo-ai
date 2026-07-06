import { NextResponse } from "next/server";
import { discoverLeads } from "@/lib/agents/webprospect";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { saveLeads } from "@/lib/leadstore";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro: web_search real puede tardar >60s (evita 504 al obtener leads)

/**
 * POST /api/leads/discover — prospección REAL por búsqueda web (Claude + web_search).
 * Devuelve negocios reales con su URL de evidencia. Si no hay clave, lo dice (no inventa).
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "discover", 6, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 4_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const niche = vstr(data?.niche, 120);
  const city = vstr(data?.city, 80);
  if (!niche || !city) {
    return NextResponse.json({ ok: false, error: "Faltan 'niche' y 'city'" }, { status: 400 });
  }
  const count = Math.min(Math.max(Number(data?.count) || 8, 1), 15);

  try {
    const result = await discoverLeads({ niche, city, count });
    await saveLeads(result.leads as any);
    return NextResponse.json({ ok: true, budget: getBudget(), ...result });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      // Honesto: sin clave NO se inventan datos.
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: "Sin ANTHROPIC_API_KEY no puedo buscar negocios reales. No entrego datos inventados.",
      });
    }
    return NextResponse.json({ ok: false, error: "No se pudo completar la búsqueda" }, { status: 500 });
  }
}
