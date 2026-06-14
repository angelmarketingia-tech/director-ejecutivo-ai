import { NextResponse } from "next/server";
import { seedLeads } from "@/lib/demo/data";
import { DEMO_MODE } from "@/lib/integrations/config";
import { rateLimit, readJsonLimited } from "@/lib/security";
import { getStoredLeads, leadStoreEnabled } from "@/lib/leadstore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leads — demo: simulados; real: leads guardados en el servidor (KV), compartidos
// entre dispositivos. Si no hay KV, devuelve vacío (cada navegador guarda los suyos).
export async function GET(req: Request) {
  const rl = rateLimit(req, "leads-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  if (DEMO_MODE) {
    return NextResponse.json({ demo: true, leads: seedLeads(20) });
  }
  const leads = await getStoredLeads();
  return NextResponse.json({ demo: false, leads, stored: leadStoreEnabled() });
}

// POST /api/leads — ingresa un lead (prospección).
export async function POST(req: Request) {
  const rl = rateLimit(req, "leads-post", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 16_000);
  if (tooLarge) return NextResponse.json({ error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });

  return NextResponse.json({ ok: true, received: data, demo: DEMO_MODE });
}
