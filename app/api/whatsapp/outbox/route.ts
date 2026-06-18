import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized } from "@/lib/security";
import { getOutbox, markSent } from "@/lib/wachat";
import { touchConnector } from "@/lib/waconnector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cola de salida para el conector WhatsApp Web.
 * GET  → mensajes que el humano encoló y faltan por enviar.
 * POST {ids:[]} → marca enviados. Auth: x-api-secret o sesión.
 */
export async function GET(req: Request) {
  const rl = rateLimit(req, "wa-outbox-get", 240, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  await touchConnector(); // el conector golpea esto cada ~5s → latido de "conectado"
  return NextResponse.json({ ok: true, messages: await getOutbox() });
}

export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-outbox-post", 240, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const { data, bad } = await readJsonLimited(req, 8_000);
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const ids = Array.isArray((data as any)?.ids) ? (data as any).ids.filter((x: any) => typeof x === "string") : [];
  await markSent(ids);
  return NextResponse.json({ ok: true });
}
