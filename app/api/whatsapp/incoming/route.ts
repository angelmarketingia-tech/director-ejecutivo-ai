import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { addInbound, addBotReply } from "@/lib/wachat";
import { getKB } from "@/lib/knowledge";
import { generateReply } from "@/lib/whatsappbot";
import { getBudget } from "@/lib/agents/budget";
import { logSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/whatsapp/incoming — el conector WhatsApp Web reenvía aquí cada mensaje entrante.
 * Si el bot está activo para ese chat y globalmente, genera la respuesta (Claude + KB) y la
 * devuelve para que el conector la envíe. Si el humano tomó el chat, devuelve reply:null.
 * Auth: x-api-secret (API_SHARED_SECRET) o sesión.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-incoming", 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 8_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const from = vstr((data as any)?.from, 40);
  const message = vstr((data as any)?.message, 2000);
  const name = vstr((data as any)?.name, 80) ?? undefined;
  if (!from || !message) return NextResponse.json({ ok: false, error: "Faltan 'from' y 'message'" }, { status: 400 });

  const chat = await addInbound(from, name, message);
  const kb = await getKB();

  // Opt-out o bot apagado (global o del chat) → no responde el bot (lo atiende el humano).
  const optOut = kb.optOutWord && message.trim().toUpperCase().includes(kb.optOutWord.toUpperCase());
  if (optOut || !kb.autoReplyEnabled || !chat.botEnabled) {
    return NextResponse.json({ ok: true, reply: null, reason: optOut ? "opt-out" : !kb.autoReplyEnabled ? "auto-off" : "human" });
  }

  try {
    const before = getBudget().spentUsd;
    const reply = await generateReply(message, { kb });
    const cost = Math.max(0, getBudget().spentUsd - before);
    await addBotReply(from, reply);
    if (cost > 0) logSpend({ at: Date.now(), user: "bot", name: "WhatsApp Bot", action: "whatsapp:auto", costUsd: Number(cost.toFixed(6)) }).catch(() => {});
    return NextResponse.json({ ok: true, reply });
  } catch {
    return NextResponse.json({ ok: true, reply: null, reason: "error" });
  }
}
