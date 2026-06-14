import { NextResponse } from "next/server";
import { research, score, writeEmail } from "@/lib/agents/workers";
import { sendEmail } from "@/lib/integrations/email";
import { isLive, DEMO_MODE } from "@/lib/integrations/config";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, recipientAllowed } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const SERVICE = "una página web profesional para conseguir más clientes";

/** Rellena los placeholders ({{contactName}}, {{company}}, {{city}}) con datos reales. */
function fillPlaceholders(text: string, lead: any): string {
  const first = (lead.contactName ?? "").split(" ")[0] ?? "";
  return (text || "")
    .replace(/\{\{\s*contactName\s*\}\}/gi, first)
    .replace(/\{\{\s*company\s*\}\}/gi, lead.company ?? "")
    .replace(/\{\{\s*city\s*\}\}/gi, lead.city ?? "")
    .replace(/\{\{\s*\w+\s*\}\}/g, "") // cualquier otro placeholder → vacío
    .replace(/Hola\s*,/g, "Hola,") // limpia "Hola ," cuando no hay nombre
    .replace(/Hola\s+,/g, "Hola,")
    .trim();
}

/**
 * POST /api/pipeline/lead — ejecuta el PIPELINE COMPLETO sobre UN lead con Claude real:
 *   ORACLE (investiga) → FORGE (califica) → QUILL (redacta el mensaje).
 * Si el lead tiene email y Resend está configurado, ENVÍA el email de verdad y lo marca
 * como contactado. Si no, deja el mensaje listo (para enviar por WhatsApp tú).
 * El cliente recorre los leads llamando a este endpoint (1 lead por llamada = sin timeouts
 * + barra de progreso). Nunca inventa datos: si falta la clave, lo dice.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "pipeline-lead", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 16_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const lead = (data as any)?.lead;
  if (!lead?.company) return NextResponse.json({ ok: false, error: "Falta 'lead'" }, { status: 400 });
  const doSend = (data as any)?.send !== false; // por defecto intenta enviar

  try {
    // 1) ORACLE investiga (Claude real)
    const r = await research(lead);
    const researchData = r.data;

    // 2) FORGE califica (Claude real)
    const sc = await score({ lead, research: researchData, service: SERVICE });
    const scoring = sc.data;

    // 3) QUILL redacta el mensaje (Claude real). Rellena placeholders con datos reales.
    const em = await writeEmail({ lead, research: researchData, service: SERVICE });
    const email = {
      subject: fillPlaceholders(em.data.subject, lead),
      body: fillPlaceholders(em.data.body, lead),
    };

    // 4) Contacto REAL: solo email si hay dirección + Resend configurado + dominio permitido.
    let sent = false;
    let sendNote: string | undefined;
    if (doSend && lead.email && !DEMO_MODE && isLive("resend") && recipientAllowed(lead.email)) {
      try {
        const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">${
          email.body.replace(/\n/g, "<br>")
        }<hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="color:#888;font-size:12px">Si no deseas recibir más mensajes, responde BAJA.</p></div>`;
        const res = await sendEmail({
          to: lead.email,
          subject: email.subject,
          html,
          unsubscribeUrl: "https://director-ejecutivo-ai.vercel.app/unsubscribe",
        });
        sent = !res.demo;
      } catch {
        sendNote = "No se pudo enviar el email (revisa Resend).";
      }
    } else if (doSend && lead.email && !isLive("resend")) {
      sendNote = "Email listo. Configura RESEND_API_KEY + EMAIL_FROM para envío automático.";
    } else if (!lead.email) {
      sendNote = "Sin email: envía el mensaje por WhatsApp (botón en el lead).";
    }

    return NextResponse.json({
      ok: true,
      budget: getBudget(),
      research: researchData,
      scoring,
      message: { subject: email.subject, body: email.body },
      sent,
      sendNote,
    });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: "Sin ANTHROPIC_API_KEY no puedo ejecutar el pipeline con IA. No invento datos.",
      });
    }
    return NextResponse.json({ ok: false, error: "No se pudo ejecutar el pipeline en este lead" }, { status: 500 });
  }
}
