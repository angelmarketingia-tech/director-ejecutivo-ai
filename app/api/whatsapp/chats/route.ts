import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, currentUser, vstr } from "@/lib/security";
import { getChats, queueHuman, setChatBot } from "@/lib/wachat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/whatsapp/chats — conversaciones para la bandeja (usuarios logueados).
export async function GET(req: Request) {
  const rl = rateLimit(req, "wa-chats-get", 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ ok: true, chats: await getChats() });
}

// POST /api/whatsapp/chats — acciones del humano: send (responder) | bot (tomar/devolver chat).
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-chats-post", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  const { data, bad } = await readJsonLimited(req, 8_000);
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const action = vstr((data as any)?.action, 20);
  const to = vstr((data as any)?.to, 40);
  if (!action || !to) return NextResponse.json({ ok: false, error: "Faltan 'action' y 'to'" }, { status: 400 });

  if (action === "send") {
    const text = vstr((data as any)?.text, 2000);
    if (!text) return NextResponse.json({ ok: false, error: "Falta 'text'" }, { status: 400 });
    await queueHuman(to, text);
  } else if (action === "bot") {
    await setChatBot(to, !!(data as any)?.on);
  } else {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, chats: await getChats() });
}
