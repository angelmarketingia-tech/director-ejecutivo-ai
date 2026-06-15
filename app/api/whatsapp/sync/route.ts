import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized } from "@/lib/security";
import { syncChats } from "@/lib/wachat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/sync — el conector envía los chats existentes de WhatsApp para que
 * se vean en la bandeja (como WhatsApp Web). Auth: x-api-secret o sesión.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-sync", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const { data, tooLarge, bad } = await readJsonLimited(req, 60_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const chats = Array.isArray((data as any)?.chats) ? (data as any).chats.slice(0, 50) : [];
  await syncChats(chats);
  return NextResponse.json({ ok: true, synced: chats.length });
}
