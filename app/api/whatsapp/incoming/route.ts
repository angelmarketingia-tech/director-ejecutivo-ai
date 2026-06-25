import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { addInbound, addBotReply, getChat, setChatBot, type WaChat } from "@/lib/wachat";
import { getKB, isOptOut } from "@/lib/knowledge";
import { generateReply } from "@/lib/whatsappbot";
import { getBudget } from "@/lib/agents/budget";
import { logSpend } from "@/lib/spendlog";
import { touchConnector } from "@/lib/waconnector";

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

  await touchConnector(); // latido del conector

  const from = vstr((data as any)?.from, 40);
  const message = vstr((data as any)?.message, 4000) ?? "";
  const name = vstr((data as any)?.name, 80) ?? undefined;
  // Modos: store-only (reply:false) → guarda y NO responde (el conector agrupa la ráfaga).
  //        replyOnly:true → NO guarda; genera UNA respuesta usando todo el historial.
  const replyOnly = (data as any)?.replyOnly === true;
  const wantReply = (data as any)?.reply !== false;
  if (!from) return NextResponse.json({ ok: false, error: "Falta 'from'" }, { status: 400 });
  if (!replyOnly && !message) return NextResponse.json({ ok: false, error: "Falta 'message'" }, { status: 400 });

  const kb = await getKB();
  const msgIsOptOut = (t: string) => isOptOut(t, kb);

  // Guarda el mensaje entrante (salvo en replyOnly, donde solo respondemos).
  let chat: WaChat | null;
  if (replyOnly) {
    chat = await getChat(from);
  } else {
    chat = await addInbound(from, name, message);
    // OPT-OUT PERMANENTE: si pide baja, apaga el bot para ese contacto PARA SIEMPRE
    // (cumplimiento + anti-baneo: nunca volver a auto-escribirle).
    if (msgIsOptOut(message)) {
      await setChatBot(from, false);
      return NextResponse.json({ ok: true, reply: null, reason: "opt-out" });
    }
    if (!wantReply) return NextResponse.json({ ok: true, reply: null, reason: "stored" }); // ráfaga: guardado, sin responder aún
  }
  if (!chat) return NextResponse.json({ ok: true, reply: null, reason: "no-chat" });

  // Salvaguardas: opt-out (en el historial reciente), bot apagado (handoff/opt-out), auto-respuesta off.
  const recentClient = chat.messages.filter((m) => m.dir === "in").slice(-6).map((m) => m.text).join(" ");
  const optOut = msgIsOptOut(recentClient);
  if (optOut) await setChatBot(from, false); // refuerza el apagado permanente
  if (optOut || !kb.autoReplyEnabled || !chat.botEnabled) {
    return NextResponse.json({ ok: true, reply: null, reason: optOut ? "opt-out" : !kb.autoReplyEnabled ? "auto-off" : "human" });
  }

  // Construye contexto: responde a TODOS los mensajes del cliente desde la última respuesta,
  // con el historial previo para total coherencia con la conversación y la base de conocimiento.
  const msgs = chat.messages.slice(-16);
  let lastOut = -1;
  for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].dir === "out") { lastOut = i; break; } }
  const trailing = msgs.slice(lastOut + 1).filter((m) => m.dir === "in").map((m) => m.text);
  const userMessage = (trailing.length ? trailing.join("\n") : message).slice(0, 4000);
  if (!userMessage) return NextResponse.json({ ok: true, reply: null, reason: "nada-que-responder" });
  const history = msgs.slice(0, lastOut + 1).map((m) => ({ role: (m.dir === "in" ? "cliente" : "negocio") as "cliente" | "negocio", text: m.text }));

  try {
    const before = getBudget().spentUsd;
    const raw = await generateReply(userMessage, { kb, history });
    // Cap de seguridad: WhatsApp = mensajes breves; evita respuestas gigantes accidentales.
    const reply = (raw || "").trim().slice(0, 1500);
    const cost = Math.max(0, getBudget().spentUsd - before);
    if (!reply) return NextResponse.json({ ok: true, reply: null, reason: "vacio" });
    await addBotReply(from, reply);
    if (cost > 0) logSpend({ at: Date.now(), user: "bot", name: "WhatsApp Bot", action: "whatsapp:auto", costUsd: Number(cost.toFixed(6)) }).catch(() => {});
    return NextResponse.json({ ok: true, reply });
  } catch {
    return NextResponse.json({ ok: true, reply: null, reason: "error" });
  }
}
