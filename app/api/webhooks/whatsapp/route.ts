import { NextResponse } from "next/server";
import { verifyWebhook, verifySignature, sendWhatsApp } from "@/lib/integrations/whatsapp";
import { rateLimit } from "@/lib/security";
import { getKB, appendWaLog } from "@/lib/knowledge";
import { generateReply } from "@/lib/whatsappbot";
import { getBudget } from "@/lib/agents/budget";
import { logSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET — handshake de verificación de Meta.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = verifyWebhook(
    searchParams.get("hub.mode") ?? "",
    searchParams.get("hub.verify_token") ?? "",
    searchParams.get("hub.challenge") ?? ""
  );
  if (challenge) return new Response(challenge, { status: 200 });
  return new Response("forbidden", { status: 403 });
}

// POST — recibe mensajes/estados. Verifica la FIRMA HMAC para rechazar webhooks falsos.
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-webhook", 120, 60_000);
  if (!rl.ok) return new Response("rate limit", { status: 429 });

  const raw = await req.text();
  if (raw.length > 200_000) return new Response("too large", { status: 413 });

  const ok = await verifySignature(raw, req.headers.get("x-hub-signature-256"));
  if (!ok) return new Response("invalid signature", { status: 401 });

  // Responde SIEMPRE 200 rápido a Meta; el procesamiento va dentro.
  try {
    const body = JSON.parse(raw);
    const messages = extractMessages(body);
    if (messages.length) await handleMessages(messages);
  } catch {
    /* payload no procesable: ignorar */
  }
  return NextResponse.json({ ok: true });
}

interface InMsg { from: string; text: string }

/** Extrae los mensajes de texto entrantes del payload de Meta. */
function extractMessages(body: any): InMsg[] {
  const out: InMsg[] = [];
  const entries = body?.entry ?? [];
  for (const e of entries) {
    for (const ch of e?.changes ?? []) {
      for (const m of ch?.value?.messages ?? []) {
        if (m?.type === "text" && m?.text?.body && m?.from) out.push({ from: m.from, text: m.text.body });
      }
    }
  }
  return out;
}

/** Genera y envía la auto-respuesta por cada mensaje, registrando conversación y costo. */
async function handleMessages(messages: InMsg[]) {
  const kb = await getKB();
  for (const m of messages) {
    // Opt-out: si escribe la palabra de baja, no se le responde automáticamente.
    if (kb.optOutWord && m.text.trim().toUpperCase().includes(kb.optOutWord.toUpperCase())) {
      await appendWaLog({ at: Date.now(), from: m.from, inbound: m.text, outbound: "(opt-out: no se responde)", auto: false });
      continue;
    }
    // Si la auto-respuesta está apagada, solo se registra el mensaje (lo atiende un humano).
    if (!kb.autoReplyEnabled) {
      await appendWaLog({ at: Date.now(), from: m.from, inbound: m.text, outbound: "(auto-respuesta desactivada)", auto: false });
      continue;
    }
    try {
      const before = getBudget().spentUsd;
      const reply = await generateReply(m.text, { kb });
      const cost = Math.max(0, getBudget().spentUsd - before);
      await sendWhatsApp({ to: m.from, bodyText: reply });
      await appendWaLog({ at: Date.now(), from: m.from, inbound: m.text, outbound: reply, auto: true });
      if (cost > 0) logSpend({ at: Date.now(), user: "bot", name: "WhatsApp Bot", action: "whatsapp:auto", costUsd: Number(cost.toFixed(6)) }).catch(() => {});
    } catch {
      await appendWaLog({ at: Date.now(), from: m.from, inbound: m.text, outbound: "(error al generar/enviar)", auto: false });
    }
  }
}
