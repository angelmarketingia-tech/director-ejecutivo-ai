import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized } from "@/lib/security";
import {
  getLeadStates,
  saveLeadStates,
  leadStoreEnabled,
  type LeadState,
} from "@/lib/leadstore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estado del avance de los leads (etapa, mensaje preparado, contactado/ganado/perdido),
 * compartido entre dispositivos vía Vercel KV. Solo guarda lo que TÚ marcas.
 */

// GET /api/leads/state — devuelve el mapa clave→estado
export async function GET(req: Request) {
  const rl = rateLimit(req, "leads-state-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const states = await getLeadStates();
  return NextResponse.json({ ok: true, states, stored: leadStoreEnabled() });
}

// POST /api/leads/state — upsert de uno o varios estados {states:[...]}
export async function POST(req: Request) {
  const rl = rateLimit(req, "leads-state-post", 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 200_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const states = (data as { states?: LeadState[] })?.states;
  if (!Array.isArray(states)) {
    return NextResponse.json({ ok: false, error: "Falta 'states' (arreglo)" }, { status: 400 });
  }
  const saved = await saveLeadStates(states);
  return NextResponse.json({ ok: true, saved, stored: leadStoreEnabled() });
}
